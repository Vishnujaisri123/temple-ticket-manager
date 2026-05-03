const mongoose = require('mongoose');
const Admin = require('./models/Admin');

mongoose.connect('mongodb+srv://temple-ticket-manager:q2LeZqBSou6rQF3A@cluster1.pitb7ob.mongodb.net/temple_tickets?appName=Cluster1').then(async () => {
  const admins = await Admin.find({}, { username: 1 });
  console.log('Admins found:', admins);
  process.exit(0);
});
