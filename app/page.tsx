import { TrackingPortal } from "@/components/tracking-portal";

export const metadata = {
  title: "NEKO Logistic – Track Your Shipment",
  description:
    "Real-time package tracking for NEKO Logistic shipments. Enter your tracking number to see the full delivery journey.",
};

export default function Home() {
  return <TrackingPortal />;
}
