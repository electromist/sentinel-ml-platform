from pyspark.sql import SparkSession
from pyspark.sql.functions import col, to_timestamp, to_date, current_timestamp
from pyspark.sql.types import StructType, StructField, StringType 

# 1. Spark Session
spark = SparkSession.builder \
    .appName("BronzeToSilver") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# 2. Paths
BRONZE_PATH = "/home/jovyan/work/data/bronze/events"
SILVER_PATH = "/home/jovyan/work/data/silver/events"

# 3. Read Bronze Data (Batch Mode - Not Streaming this time for simplicity)
# Streaming data ko batch mein process karna easier hota hai interview demo ke liye
try:
    df_bronze = spark.read.json(BRONZE_PATH)
    
    # Check if data exists
    if df_bronze.rdd.isEmpty():
        print("⚠️ No data found in Bronze layer yet!")
        spark.stop()
        exit()

    print(f"✅ Read {df_bronze.count()} records from Bronze")

    # 4. Transformations (Cleaning)
    df_silver = df_bronze \
        .withColumn("event_ts", to_timestamp(col("timestamp"))) \
        .withColumn("event_date", to_date(col("timestamp"))) \
        .withColumn("processed_at", current_timestamp()) \
        .dropDuplicates(["userId", "timestamp", "action"]) \
        .select("userId", "action", "event_ts", "event_date", "details", "processed_at")

    # 5. Partitioned Write to Silver (Parquet Format)
    # PartitionBy('event_date') = Data ko date-wise folders mein organize karna (Optimization)
    df_silver.write \
        .mode("overwrite") \
        .partitionBy("event_date") \
        .parquet(SILVER_PATH)

    print("✅ Successfully wrote data to Silver Layer (Parquet format)")
    
    # Verify result
    spark.read.parquet(SILVER_PATH).show(truncate=False)

except Exception as e:
    print(f"❌ Error: {str(e)}")

spark.stop()