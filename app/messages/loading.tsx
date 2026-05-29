import { InboxListSkeleton } from "@/components/messages/MessageSkeletons";

export default function MessagesLoading() {
  return (
    <div className="space-y-3">
      <div className="flex animate-pulse items-center justify-between px-0.5">
        <div className="h-7 w-28 rounded-lg bg-white/5" />
        <div className="size-10 rounded-full bg-white/5" />
      </div>
      <div className="h-11 animate-pulse rounded-2xl bg-white/5" />
      <div className="h-11 animate-pulse rounded-2xl bg-white/5" />
      <InboxListSkeleton />
    </div>
  );
}
