"use client";

import {
  CaseEvidenceBlockEditor,
  CaseNoteBlockEditor,
  CaseSummaryBlockEditor,
  CaseSuspectBlockEditor,
  CaseTimelineBlockEditor,
  ChatMessageBlockEditor,
  ChatMissedCallBlockEditor,
  ChatSystemBlockEditor,
  ChatVoiceNoteBlockEditor,
  ChoiceNodeBlockEditor,
  ChoiceOptionBlockEditor,
  DiaryEntryBlockEditor,
  DividerBlockEditor,
  HeadingBlockEditor,
  ImageBlockEditor,
  ProseBlockEditor,
  QuoteBlockEditor,
  ScriptActionBlockEditor,
  ScriptDialogueBlockEditor,
  SocialCommentBlockEditor,
  SocialPostBlockEditor,
  SocialReactionBlockEditor,
  SystemNoticeBlockEditor,
  SystemQuestBlockEditor,
  SystemRewardBlockEditor,
  SystemStatsBlockEditor,
  type ComposerImageUploadContext
} from "@/components/composer/editors/block-editors";
import { BLOCK_TYPE_LABELS } from "@/lib/composer/blocks";
import type { ComposerBlockUnion } from "@/lib/composer/types";

type BlockEditorShellProps = {
  block: ComposerBlockUnion;
  disabled?: boolean;
  imageUpload?: ComposerImageUploadContext;
  onChange: (block: ComposerBlockUnion) => void;
};

export function BlockEditorShell({
  block,
  disabled,
  imageUpload,
  onChange
}: BlockEditorShellProps) {
  const title = BLOCK_TYPE_LABELS[block.type];

  const editor = (() => {
    switch (block.type) {
      case "heading":
        return <HeadingBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "prose":
        return <ProseBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "quote":
        return <QuoteBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "divider":
        return <DividerBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "image":
        return (
          <ImageBlockEditor
            block={block}
            disabled={disabled}
            imageUpload={imageUpload}
            onChange={onChange}
          />
        );
      case "chat_message":
        return <ChatMessageBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "chat_system":
        return <ChatSystemBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "chat_missed_call":
        return (
          <ChatMissedCallBlockEditor block={block} disabled={disabled} onChange={onChange} />
        );
      case "chat_voice_note":
        return <ChatVoiceNoteBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "case_summary":
        return <CaseSummaryBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "case_timeline":
        return <CaseTimelineBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "case_evidence":
        return (
          <CaseEvidenceBlockEditor
            block={block}
            disabled={disabled}
            imageUpload={imageUpload}
            onChange={onChange}
          />
        );
      case "case_suspect":
        return <CaseSuspectBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "case_note":
        return <CaseNoteBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "diary_entry":
        return <DiaryEntryBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "system_notice":
        return <SystemNoticeBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "system_stats":
        return <SystemStatsBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "system_quest":
        return <SystemQuestBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "system_reward":
        return <SystemRewardBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "script_dialogue":
        return <ScriptDialogueBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "script_action":
        return <ScriptActionBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "social_post":
        return <SocialPostBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "social_comment":
        return (
          <SocialCommentBlockEditor block={block} disabled={disabled} onChange={onChange} />
        );
      case "social_reaction":
        return (
          <SocialReactionBlockEditor block={block} disabled={disabled} onChange={onChange} />
        );
      case "choice_node":
        return <ChoiceNodeBlockEditor block={block} disabled={disabled} onChange={onChange} />;
      case "choice_option":
        return (
          <ChoiceOptionBlockEditor block={block} disabled={disabled} onChange={onChange} />
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-300/90">{title}</p>
      {editor}
    </div>
  );
}
