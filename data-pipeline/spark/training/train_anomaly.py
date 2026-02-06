from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, window
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.clustering import KMeans  # Using KMeans for simplicity demo (clustering users)
from pyspark.ml import Pipeline

# 1. Spark Session
spark = SparkSession.builder \
    .appName("TrainAnomalyModel") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

SILVER_PATH = "/home/jovyan/work/data/silver/events"
MODEL_PATH = "/home/jovyan/work/models/anomaly_detector"

print("🔄 Loading Silver Data...")
try:
    # Read Parquet data
    df = spark.read.parquet(SILVER_PATH)
    
    # 2. Feature Engineering: User Action Count Aggregation
    # Real-world mein hum "Sliding Window" use karte, yahan simple groupby
    # Feature we want: "actions_count" per user
    user_features = df.groupBy("userId") \
        .agg(count("action").alias("action_count"))
    
    # Fill nulls if any
    user_features = user_features.na.fill(0)
    
    print(f"📊 Training data prepared. Count: {user_features.count()}")
    user_features.show()

    # 3. Prepare Vector for ML (Spark MLlib needs vector column)
    assembler = VectorAssembler(
        inputCols=["action_count"],
        outputCol="features"
    )

    # 4. Train Model (K-Means Clustering)
    # Logic: Divide users into 2 groups: Normal Behavior vs High Activity (Potential Anomaly)
    kmeans = KMeans(k=2, seed=123)
    
    pipeline = Pipeline(stages=[assembler, kmeans])
    
    print("🤖 Training Model...")
    model = pipeline.fit(user_features)
    
    # 5. Predict / Evaluate
    predictions = model.transform(user_features)
    print("📝 Model Predictions (Cluster 0 or 1):")
    predictions.select("userId", "action_count", "prediction").show()

    # 6. Save Model (For serving later)
    # Pehle purana delete karte hain (simple trick)
    import shutil
    import os
    if os.path.exists(MODEL_PATH):
        shutil.rmtree(MODEL_PATH)
        
    model.save(MODEL_PATH)
    print(f"💾 Model Info saved to {MODEL_PATH}")

except Exception as e:
    print(f"❌ Error: {str(e)}")

spark.stop()