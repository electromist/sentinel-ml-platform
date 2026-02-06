import { NextResponse } from "next/server";
import { sendEvent } from "@/lib/kafka";

export async function POST() {
  const eventData = {
    userId: "user_123",
    action: "button_click",
    timestamp: new Date().toISOString(),
    details: "Testing Pipeline Connectivity",
  };

  // 'user-activity' naam ke topic (folder) mein data bhej rahe hain
  await sendEvent("user-activity", eventData);

  return NextResponse.json({ success: true, message: "Event pushed to Kafka" });
}
