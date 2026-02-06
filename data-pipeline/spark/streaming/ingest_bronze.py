from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, schema_of_json, lit
from pyspark.sql.types import StructType, StructField, StringType, TimestampType

# Spark Session
spark = SparkSession.builder \
    .appName("RealTimeKafkaToBronze") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .config("spark.sql.streaming.schemaInference", "true") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

print("\n" + "=" * 70)
print("🚀 REAL-TIME STREAMING PIPELINE STARTED")
print("=" * 70)

# Read from Kafka Stream
print("📡 Connecting to Kafka (kafka:29092 / topic: user-activity)...")
df_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:29092") \
    .option("subscribe", "user-activity") \
    .option("startingOffsets", "earliest") \
    .option("failOnDataLoss", "false") \
    .option("maxOffsetsPerTrigger", "100") \
    .load()

print("✅ Kafka connected!")

# Extract raw JSON string from Kafka value
df_bronze = df_stream.selectExpr(
    "CAST(value AS STRING) as event_data",
    "CAST(timestamp AS TIMESTAMP) as kafka_timestamp",
    "topic",
    "partition",
    "offset"
)

# Define a function to process each batch (Write to File + Print to Console)
def process_batch(df, epoch_id):
    # Cache to avoid reading twice
    df.cache()
    count = df.count()
    
    if count > 0:
        print(f"\n📦 BATCH {epoch_id}: Found {count} new events!")
        print("   Writing to Bronze layer...")
        
        # Write to JSON Files
        df.write \
            .mode("append") \
            .json("/home/jovyan/work/data/bronze/events")
            
        print("   ✅ Write Complete!")
        df.show(5, truncate=False)
    else:
        # Optional: Print simple dot to show it's alive, or nothing
        print(".", end="", flush=True)
    
    df.unpersist()

# Start Streaming with foreachBatch
print("📂 Output: /home/jovyan/work/data/bronze/events")
print("💾 Checkpoint: /home/jovyan/work/data/bronze/checkpoint")
print("\n" + "=" * 70)
print("🎯 PIPELINE ACTIVE - Waiting for new Kafka messages...")
print("   Trigger: Every 5 seconds")
print("   Send test: Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/test-kafka'")
print("=" * 70 + "\n")

query = df_bronze.writeStream \
    .outputMode("append") \
    .foreachBatch(process_batch) \
    .option("checkpointLocation", "/home/jovyan/work/data/bronze/checkpoint") \
    .trigger(processingTime='5 seconds') \
    .start()

# Keep running - Press Ctrl+C to stop
try:
    query.awaitTermination()
except KeyboardInterrupt:
    print("\n🛑 Pipeline stopped by user")
    query.stop()
    spark.stop()
