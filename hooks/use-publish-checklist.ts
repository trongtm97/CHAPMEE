"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  publishChecklistHasBlockingErrors,
  publishChecklistHasWarnings
} from "@/components/studio/PublishChecklist";
import { getPublishChecklistAction } from "@/lib/studio/scheduling/scheduling-actions";
import { validateChapterBeforePublish } from "@/lib/publish/validate-chapter-before-publish";
import { validateStoryBeforePublish } from "@/lib/publish/validate-story-before-publish";
import { validateReelsBeforePublish } from "@/lib/publish/validate-reels-before-publish";
import { mergeChecklistResults } from "@/lib/publish/checklist-utils";
import type { ChapterPublishInput } from "@/lib/publish/validate-chapter-before-publish";
import type { StoryPublishInput } from "@/lib/publish/validate-story-before-publish";
import type { ReelsPublishInput } from "@/lib/publish/validate-reels-before-publish";
import type { PublishChecklistRule } from "@/types/publish-checklist";
import type { ScheduledTargetType } from "@/types/scheduling";
import { isReelsScheduledTarget } from "@/types/scheduling";

type UsePublishChecklistOptions = {
  targetType: ScheduledTargetType;
  targetId?: string | null;
  storyId?: string | null;
  enabled?: boolean;
  localStory?: StoryPublishInput | null;
  localChapter?: ChapterPublishInput | null;
  localReels?: ReelsPublishInput | null;
};

export function usePublishChecklist({
  enabled = true,
  localChapter,
  localReels,
  localStory,
  storyId,
  targetId,
  targetType
}: UsePublishChecklistOptions) {
  const [remoteRules, setRemoteRules] = useState<PublishChecklistRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const localRules = useMemo(() => {
    if (targetType === "story" && localStory) {
      return validateStoryBeforePublish(localStory).rules;
    }

    if (targetType === "chapter" && localChapter) {
      return validateChapterBeforePublish(localChapter, localStory ?? undefined).rules;
    }

    if (isReelsScheduledTarget(targetType) && localReels) {
      return validateReelsBeforePublish(localReels).rules;
    }

    return [];
  }, [localChapter, localReels, localStory, targetType]);

  const refresh = useCallback(() => {
    if (!enabled || !targetId) {
      setRemoteRules([]);
      return;
    }

    setLoading(true);
    startTransition(async () => {
      const result = await getPublishChecklistAction({
        storyId,
        targetId,
        targetType
      });

      setRemoteRules(result.rules ?? []);
      setLoading(false);
    });
  }, [enabled, storyId, targetId, targetType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rules = useMemo(() => {
    if (remoteRules.length === 0) {
      return localRules;
    }

    return mergeChecklistResults(
      { hasBlockingErrors: false, hasWarnings: false, ok: true, rules: localRules },
      { hasBlockingErrors: false, hasWarnings: false, ok: true, rules: remoteRules }
    ).rules;
  }, [localRules, remoteRules]);

  const hasBlockingErrors = publishChecklistHasBlockingErrors(rules);
  const hasWarnings = publishChecklistHasWarnings(rules);

  return {
    hasBlockingErrors,
    hasWarnings,
    loading,
    refresh,
    rules
  };
}
