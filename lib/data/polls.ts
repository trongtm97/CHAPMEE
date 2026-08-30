"use server";

import { createClient } from "@/lib/data/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { createBulkNotifications } from "@/lib/notifications/create-notification";
import type {
  PollFormValues,
  PollOptionRecord,
  PollOptionView,
  PollRecord,
  PollStatus,
  PollView
} from "@/types/poll";

type PollRow = {
  id: string;
  story_id: string;
  chapter_id: string | null;
  author_id: string;
  question: string;
  status: PollStatus;
  closes_at: string | null;
  created_at: string;
  poll_options?:
    | PollOptionRow
    | PollOptionRow[]
    | null;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  option_text: string;
  sort_order: number;
  created_at: string;
};

function toPollOptionRecord(row: PollOptionRow): PollOptionRecord {
  return {
    id: row.id,
    pollId: row.poll_id,
    optionText: row.option_text,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at
  };
}

function toPollRecord(row: PollRow, options: PollOptionRecord[]): PollRecord {
  return {
    id: row.id,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    authorId: row.author_id,
    question: row.question,
    status: row.status,
    closesAt: row.closes_at,
    createdAt: row.created_at,
    options
  };
}

function buildPollView(input: {
  poll: PollRecord;
  selectedOptionId: string | null;
  voteCounts: Map<string, number>;
}) {
  const totalVotes = [...input.voteCounts.values()].reduce((sum, count) => sum + count, 0);
  const isClosedByTime = input.poll.closesAt
    ? new Date(input.poll.closesAt).getTime() <= Date.now()
    : false;
  const options = input.poll.options.map((option) => {
    const voteCount = input.voteCounts.get(option.id) ?? 0;
    const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

    return {
      ...option,
      voteCount,
      percent,
      isSelected: input.selectedOptionId === option.id
    } satisfies PollOptionView;
  });

  return {
    ...input.poll,
    canVote: input.poll.status === "active" && !isClosedByTime,
    hasVoted: Boolean(input.selectedOptionId),
    options,
    totalVotes,
    userVoteOptionId: input.selectedOptionId
  } satisfies PollView;
}

async function loadPollView(input: {
  pollRow: PollRow | null;
  userId?: string | null;
}): Promise<PollView | null> {
  const { pollRow, userId } = input;

  if (!pollRow) {
    return null;
  }

  const db = await createClient();

  const { data: optionRows, error: optionsError } = await db
    .from("poll_options")
    .select("id, poll_id, option_text, sort_order, created_at")
    .eq("poll_id", pollRow.id)
    .order("sort_order", { ascending: true });

  if (optionsError) {
    throw optionsError;
  }

  const options = ((optionRows ?? []) as PollOptionRow[]).map(toPollOptionRecord);
  const poll = toPollRecord(
    {
      ...pollRow,
      poll_options: null
    },
    options
  );

  const { data: voteRows, error: voteError } = await db
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", poll.id);

  if (voteError) {
    throw voteError;
  }

  const userVoteRows = userId
    ? await db
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null, error: null };

  if (userVoteRows.error) {
    throw userVoteRows.error;
  }

  const voteCounts = new Map<string, number>();
  for (const row of (voteRows ?? []) as Array<{ option_id: string }>) {
    voteCounts.set(row.option_id, (voteCounts.get(row.option_id) ?? 0) + 1);
  }

  return buildPollView({
    poll,
    selectedOptionId: userVoteRows.data?.option_id ?? null,
    voteCounts
  });
}

export async function getEpisodePoll(
  episodeId: string,
  userId?: string | null
): Promise<PollView | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("polls")
    .select("id, story_id, chapter_id, author_id, question, status, closes_at, created_at")
    .eq("chapter_id", episodeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return loadPollView({ pollRow: data as PollRow | null, userId });
}

export async function getStoryPoll(
  storyId: string,
  userId?: string | null
): Promise<PollView | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("polls")
    .select("id, story_id, chapter_id, author_id, question, status, closes_at, created_at")
    .eq("story_id", storyId)
    .is("chapter_id", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return loadPollView({ pollRow: data as PollRow | null, userId });
}

export async function saveEpisodePoll(input: {
  authorId: string;
  storyId: string;
  chapterId: string;
  question: string;
  optionTexts: string[];
  status: PollStatus;
  closesAt?: string | null;
}) {
  const db = await createClient();
  const question = input.question.trim();
  const options = input.optionTexts.map((text) => text.trim()).filter(Boolean);

  if (!question || options.length < 2) {
    return { error: null, pollId: null, saved: false };
  }

  const { data: existing, error: existingError } = await db
    .from("polls")
    .select("id, status, question")
    .eq("story_id", input.storyId)
    .eq("chapter_id", input.chapterId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  let pollId = existing?.id ?? null;

  if (!pollId) {
    const { data: created, error: createError } = await db
      .from("polls")
      .insert({
        author_id: input.authorId,
        chapter_id: input.chapterId,
        closes_at: input.closesAt ?? null,
        question,
        status: input.status,
        story_id: input.storyId
      })
      .select("id")
      .single();

    if (createError || !created) {
      return {
        error: createError?.message ?? "Không tạo được poll.",
        pollId: null,
        saved: false
      };
    }

    pollId = created.id;
  } else {
    if (!existing) {
      return { error: "Không tìm thấy poll hiện tại để cập nhật.", pollId: null, saved: false };
    }
    const statusChangedToClosed = existing.status !== "closed" && input.status === "closed";
    const { error: updateError } = await db
      .from("polls")
      .update({
        closes_at: input.closesAt ?? null,
        question,
        status: input.status
      })
      .eq("id", pollId);

    if (updateError) {
      return { error: updateError.message, pollId: null, saved: false };
    }

    if (statusChangedToClosed) {
      const { data: voters } = await db
        .from("poll_votes")
        .select("user_id")
        .eq("poll_id", pollId);

      await createBulkNotifications(
        Array.from(new Set((voters ?? []).map((row) => row.user_id))).filter(
          (userId) => userId !== input.authorId
        ),
        "poll_result_updated",
        {
          actionUrl: input.chapterId ? `/chapter/${input.chapterId}` : "/notifications",
          body: `Poll "${existing.question}" đã đóng, kết quả đã sẵn sàng.`,
          dedupeWindowMinutes: 720,
          metadata: {
            poll_id: pollId,
            question: existing.question,
            story_id: input.storyId
          },
          targetId: pollId,
          targetType: "chapter",
          title: "Kết quả poll đã cập nhật"
        }
      );
    }
  }

  const { data: existingOptions, error: existingOptionsError } = await db
    .from("poll_options")
    .select("id, poll_id, option_text, sort_order, created_at")
    .eq("poll_id", pollId)
    .order("sort_order", { ascending: true });

  if (existingOptionsError) {
    return { error: existingOptionsError.message, pollId, saved: false };
  }

  const existingByOrder = new Map(
    ((existingOptions ?? []) as PollOptionRow[]).map((option) => [option.sort_order, option])
  );

  for (let index = 0; index < options.length; index += 1) {
    const sortOrder = index + 1;
    const optionText = options[index];
    const existingOption = existingByOrder.get(sortOrder);

    if (existingOption) {
      const { error: optionUpdateError } = await db
        .from("poll_options")
        .update({ option_text: optionText })
        .eq("id", existingOption.id);

      if (optionUpdateError) {
        return { error: optionUpdateError.message, pollId, saved: false };
      }
    } else {
      const { error: optionInsertError } = await db.from("poll_options").insert({
        option_text: optionText,
        poll_id: pollId,
        sort_order: sortOrder
      });

      if (optionInsertError) {
        return { error: optionInsertError.message, pollId, saved: false };
      }
    }
  }

  const extraOptions = (existingOptions ?? [])
    .filter((option) => option.sort_order > options.length)
    .map((option) => option.id);

  if (extraOptions.length > 0) {
    const { error: deleteError } = await db
      .from("poll_options")
      .delete()
      .in("id", extraOptions);

    if (deleteError) {
      return { error: deleteError.message, pollId, saved: false };
    }
  }

  return { error: null, pollId, saved: true };
}

export async function votePoll(input: {
  pollId: string;
  optionId: string;
  userId?: string | null;
  storyId?: string | null;
  authorId?: string | null;
}) {
  if (!input.userId) {
    return { loginRequired: true, ok: false, error: null as string | null };
  }

  const db = await createClient();
  const { data: existing, error: existingError } = await db
    .from("poll_votes")
    .select("id, option_id")
    .eq("poll_id", input.pollId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const { error } = await db
      .from("poll_votes")
      .update({ option_id: input.optionId })
      .eq("id", existing.id);

    if (error) {
      return { loginRequired: false, ok: false, error: error.message };
    }
  } else {
    const { error } = await db.from("poll_votes").insert({
      option_id: input.optionId,
      poll_id: input.pollId,
      user_id: input.userId
    });

    if (error) {
      return { loginRequired: false, ok: false, error: error.message };
    }
  }

  if (input.storyId || input.authorId) {
    await safeRecordFanScoreAction({
      authorId: input.authorId ?? null,
      eventKey: "vote_poll",
      metadata: {
        poll_id: input.pollId,
        option_id: input.optionId,
        story_id: input.storyId ?? null
      },
      sourceId: input.pollId,
      storyId: input.storyId ?? null,
      userId: input.userId
    });
  }

  return { loginRequired: false, ok: true, error: null };
}

export async function votePollAction(formData: FormData) {
  const pollId = String(formData.get("pollId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/");

  if (!pollId || !optionId) {
    throw new Error("Thiếu dữ liệu poll.");
  }

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const { data: pollRow } = await db
    .from("polls")
    .select("story_id, author_id")
    .eq("id", pollId)
    .maybeSingle();

  if (!pollRow) {
    throw new Error("Poll không tồn tại.");
  }

  const result = await votePoll({
    authorId: pollRow.author_id,
    optionId,
    pollId,
    storyId: pollRow.story_id,
    userId: user.id
  });

  if (!result.ok) {
    throw new Error(result.error ?? "Không thể vote poll.");
  }

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function parsePollFormData(formData: FormData): Promise<PollFormValues | null> {
  const question = String(formData.get("poll_question") ?? "").trim();
  const status = String(formData.get("poll_status") ?? "active") as PollStatus;
  const optionTexts = [1, 2, 3, 4].map((index) =>
    String(formData.get(`poll_option_${index}`) ?? "").trim()
  );

  const hasAnyPollInput = Boolean(question || optionTexts.some(Boolean));

  if (!hasAnyPollInput) {
    return null;
  }

  if (!question) {
    throw new Error("Vui lòng nhập câu hỏi poll.");
  }

  const validOptions = optionTexts.filter(Boolean);

  if (validOptions.length < 2) {
    throw new Error("Poll cần ít nhất 2 lựa chọn.");
  }

  if (validOptions.length > 4) {
    throw new Error("Poll chỉ hỗ trợ tối đa 4 lựa chọn.");
  }

  return {
    question,
    status: status === "closed" ? "closed" : "active",
    optionTexts: optionTexts.slice(0, 4)
  };
}
