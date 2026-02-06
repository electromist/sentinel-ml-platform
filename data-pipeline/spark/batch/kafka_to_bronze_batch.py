from pyspark.sql import SparkSession

# Simple BATCH consumer to verify Kafka -> File pipeline works
spark = SparkSession.builder \
    .appName("KafkaBatchTest") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .getOrCreate()

spark.sparkContext.setLogLevel("ERROR")

print("=" * 60)
print("🧪 BATCH MODE: Reading ALL messages from Kafka")
print("=" * 60)

# Read from Kafka (BATCH mode - reads what's there and stops)
df = spark.read \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:29092") \
    .option("subscribe", "user-activity") \
    .option("startingOffsets", "earliest") \
    .option("endingOffsets", "latest") \
    .load()

print(f"📊 Total messages found in Kafka: {df.count()}")

# Extract event data
df_bronze = df.selectExpr(
    "CAST(value AS STRING) as event_data",
    "CAST(timestamp AS TIMESTAMP) as kafka_timestamp"
)

# Show sample
print("\n📝 Sample data (first 5 rows):")
df_bronze.show(5, truncate=False)

# Write to Bronze Layer
output_path = "/home/jovyan/work/data/bronze/batch_test"
print(f"\n💾 Writing to: {output_path}")

df_bronze.write \
    .mode("overwrite") \
    .json(output_path)

print("✅ SUCCESS! Check the folder for .json files")
print("=" * 60)

spark.stop()
