import { TrackingPortal } from "@/components/tracking-portal";

export const metadata = {
  title: "Tracking Paket | NekoLogistic",
};

export default function TrackingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
      <TrackingPortal />
    </div>
  );
}
