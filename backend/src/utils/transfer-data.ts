import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SOURCE_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';

const runTransfer = async () => {
  // Grab destination URI from command line arguments
  const args = process.argv.slice(2);
  const destUri = args[0];

  if (!destUri) {
    console.error('❌ Error: Destination MongoDB URI is required.');
    console.log('\nUsage: npx ts-node src/utils/transfer-data.ts <DESTINATION_MONGO_URI>');
    process.exit(1);
  }

  if (destUri === SOURCE_MONGO_URI) {
    console.error('❌ Error: Source and Destination MongoDB URIs cannot be the same.');
    process.exit(1);
  }

  console.log(`🔌 Source DB:      ${SOURCE_MONGO_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`🔌 Destination DB: ${destUri.replace(/:([^@]+)@/, ':****@')}`);

  try {
    if (SOURCE_MONGO_URI.startsWith('mongodb+srv://') || destUri.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }

    console.log('🔄 Connecting to Source database...');
    const sourceConnection = await mongoose.createConnection(SOURCE_MONGO_URI).asPromise();
    console.log('✅ Connected to Source MongoDB.');

    console.log('🔄 Connecting to Destination database...');
    const destConnection = await mongoose.createConnection(destUri).asPromise();
    console.log('✅ Connected to Destination MongoDB.');

    const collectionsToTransfer = [
      'users',
      'students',
      'academics',
      'attendances',
      'cambridgescoremaps',
      'activityscoremaps'
    ];

    const BATCH_SIZE = 1000;

    for (const colName of collectionsToTransfer) {
      console.log(`\n📦 Processing collection: '${colName}'`);
      
      const sourceCol = sourceConnection.collection(colName);
      const destCol = destConnection.collection(colName);

      // Clean target collection first
      console.log(`  🧹 Dropping/cleaning existing documents in destination collection '${colName}'...`);
      await destCol.deleteMany({});

      // Count documents in source
      const totalDocs = await sourceCol.countDocuments();
      console.log(`  📑 Total documents in source: ${totalDocs}`);

      if (totalDocs === 0) {
        console.log(`  ℹ️ Skipping empty collection: '${colName}'`);
        continue;
      }

      // Read and insert in batches
      let processed = 0;
      const cursor = sourceCol.find({});

      let batch: any[] = [];
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (doc) {
          batch.push(doc);
        }

        if (batch.length >= BATCH_SIZE) {
          await destCol.insertMany(batch);
          processed += batch.length;
          console.log(`  📥 Transferred batch: ${processed} / ${totalDocs} documents`);
          batch = [];
        }
      }

      // Insert remaining documents in the final batch
      if (batch.length > 0) {
        await destCol.insertMany(batch);
        processed += batch.length;
        console.log(`  📥 Transferred batch: ${processed} / ${totalDocs} documents`);
      }

      console.log(`  ✅ Successfully transferred collection '${colName}'.`);
    }

    console.log('\n🎉 Data transfer completed successfully! All records (Registration No, CGPA, Year, Attendance, Grades) have been copied without any achievements or certificates.');

    await sourceConnection.close();
    await destConnection.close();
    console.log('📡 Connections closed.');

  } catch (error) {
    console.error('❌ Data transfer failed:', error);
    process.exit(1);
  }
};

runTransfer();
