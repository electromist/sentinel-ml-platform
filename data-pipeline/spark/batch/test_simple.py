from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("SimpleTest") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .getOrCreate()

spark.sparkContext.setLogLevel("ERROR")

print("\n" + "="*60)
print("STEP 1: Connecting to Kafka...")
print("="*60)

try:
    df = spark.read \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "kafka:29092") \
        .option("subscribe", "user-activity") \
        .option("startingOffsets", "earliest") \
        .option("endingOffsets", "latest") \
        .load()
    
    print("✅ Kafka connected!")
    
    print("\n" + "="*60)
    print("STEP 2: Counting messages...")
    print("="*60)
    
    count = df.count()
    print(f"✅ Found {count} messages in Kafka")
    
    if count == 0:
        print("\n❌ NO MESSAGES in Kafka!")
        print("   Solution: Send messages first:")
        print("   Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/test-kafka'")
    else:
        print("\n" + "="*60)
        print("STEP 3: Showing data...")
        print("="*60)
        
        df_data = df.selectExpr("CAST(value AS STRING) as event_data")
        df_data.show(10, truncate=False)
        
        print("\n" + "="*60)
        print("STEP 4: Saving to file...")
        print("="*60)
        
        df_data.write.mode("overwrite").json("/home/jovyan/work/data/bronze/test_output")
        print("✅ Saved to: data/bronze/test_output/")
        print("   Check VS Code for .json files!")
        
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\n🔧 Check:")
    print("   1. Is Kafka container running? (docker ps)")
    print("   2. Are you inside jupyter-spark container?")

print("\n" + "="*60)
print("DONE!")
print("="*60 + "\n")

spark.stop()
