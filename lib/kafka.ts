import { Kafka, Producer, LogLevel } from "kafkajs";

// Kafka client setup - ye batata hai Kafka kahan chal raha hai (localhost:9092)
const kafka = new Kafka({
  clientId: "saas-platform",
  brokers: ["localhost:9092"],
  // LogLevel.ERROR causes issues in some Next.js builds, using numeric value 1 instead
  logLevel: 1,
});

let producer: Producer | null = null;

export const getKafkaProducer = async () => {
  if (producer) {
    // Check if connected before returning
    try {
      // Quick verification (is connected?) - internal property check or similar
      // Or simply trust it, but if it disconnects, KafkaJS usually handles reconnect
      // However, in Next.js Server Actions, scope might be lost
      return producer;
    } catch {
      producer = null;
    }
  }

  // Producer wo hota hai jo messages BHEJTA hai
  const newProducer = kafka.producer(); // Create new instance locally first

  try {
    await newProducer.connect();
    producer = newProducer; // Assign only if connected
    console.log("✅ Kafka Producer connected");
  } catch (error) {
    console.error(
      "❌ Kafka Connection Error (Continuing without Kafka):",
      error,
    );
    // Development mein agar Kafka nahi chal raha to app crash na ho
    return null;
  }
  return producer;
};

// Ek simple function messages bhejne ke liye
export const sendEvent = async (topic: string, message: object) => {
  console.log(`🔌 Connecting to Kafka for topic: ${topic}...`);
  try {
    const producer = await getKafkaProducer();
    if (!producer) {
      console.error("❌ Kafka Producer is NULL. Skipping event.");
      return;
    }

    console.log(
      `📨 Sending event to ${topic}:`,
      JSON.stringify(message).substring(0, 50) + "...",
    );
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
      acks: 1, // Ensure leader acknowledges
    });
    console.log(`✅ SUCCESS: Event sent to ${topic}`);
  } catch (error) {
    // If producer disconnects mid-flight
    console.error(`❌ FAILED to send event to ${topic}. Error:`, error);
    // Reset producer so next try reconnects
    producer = null;
  }
};
