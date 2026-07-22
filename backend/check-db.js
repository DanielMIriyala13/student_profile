const mongoose = require('mongoose');
const uri = 'mongodb+srv://231fa04864:Maruthi%4021@cluster0.i4pxc52.mongodb.net/edupulse?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;

  const cols = [
    'certifications', 'projects', 'activitycertifications',
    'cocurricularactivities', 'extracurricularactivities',
    'codingchallenges', 'leadershipactivities'
  ];

  let grandTotal = 0;
  for (const name of cols) {
    const col = db.collection(name);
    const total = await col.countDocuments();
    const pending = await col.countDocuments({ status: 'PENDING' });
    const approved = await col.countDocuments({ status: { $in: ['APPROVED', 'VERIFIED'] } });
    console.log(`${name}: total=${total} | PENDING=${pending} | APPROVED=${approved}`);
    grandTotal += pending;
  }
  console.log(`\nTotal PENDING submissions ready for faculty approval: ${grandTotal}`);

  // Sample 3 to verify data looks correct
  const certCol = db.collection('certifications');
  const samples = await certCol.find({ status: 'PENDING' }).limit(3).toArray();
  console.log('\nSample pending certifications:');
  for (const s of samples) {
    const studentCol = db.collection('students');
    const student = await studentCol.findOne({ _id: s.studentId });
    console.log(`  ${student ? student.rollNumber + ' - ' + student.name : 'unknown'} | ${s.certificateName} | file=${s.certificateFile}`);
  }

  mongoose.disconnect();
}).catch(e => console.error('Connection error:', e.message));
