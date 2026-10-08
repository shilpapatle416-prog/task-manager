const dotenv = require('dotenv');
const User = require('./models/User');
const Task = require('./models/Task');
const connectDB = require('./config/db');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing demo data...');
    const demoEmail = 'demo@example.com';
    const existingDemo = await User.findOne({ email: demoEmail });
    if (existingDemo) {
      await Task.deleteMany({ user: existingDemo.id });
      await User.deleteOne({ id: existingDemo.id });
    }

    console.log('👤 Creating Demo User...');
    const demoUser = await User.create({
      name: 'Alex Morgan',
      email: demoEmail,
      password: 'password123'
    });

    console.log(`Demo User created: ${demoUser.email} (Password: password123)`);

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const sampleTasks = [
      {
        user: demoUser.id,
        title: 'Complete Distributed Systems Assignment',
        description: 'Implement Raft consensus algorithm replication and write test benchmarks for 5 nodes.',
        priority: 'High',
        category: 'College',
        status: 'In Progress',
        dueDate: new Date(now.getTime() + 1 * oneDay) // Due tomorrow
      },
      {
        user: demoUser.id,
        title: 'Submit Machine Learning Project Report',
        description: 'Format IEEE paper draft, add confusion matrix charts, and upload final PDF to portal.',
        priority: 'High',
        category: 'Project',
        status: 'Pending',
        dueDate: new Date(now.getTime() - 2 * oneDay) // Overdue by 2 days
      },
      {
        user: demoUser.id,
        title: 'Design Dark Mode UI System in CSS',
        description: 'Refine color tokens, contrast accessibility, glassmorphic card overlays, and transitions.',
        priority: 'Medium',
        category: 'Work',
        status: 'Completed',
        dueDate: new Date(now.getTime() - 1 * oneDay),
        completedAt: new Date()
      },
      {
        user: demoUser.id,
        title: 'Weekly Grocery & Meal Prep',
        description: 'Pick up vegetables, oats, fruits, and prepare high-protein lunches for the week.',
        priority: 'Low',
        category: 'Personal',
        status: 'Pending',
        dueDate: new Date(now.getTime() + 3 * oneDay)
      },
      {
        user: demoUser.id,
        title: 'Team Sprint Planning & Backlog Grooming',
        description: 'Review Q4 deliverables, estimate story points with engineering team, and update Jira board.',
        priority: 'Medium',
        category: 'Work',
        status: 'In Progress',
        dueDate: new Date(now.getTime() + 2 * oneDay)
      },
      {
        user: demoUser.id,
        title: 'Schedule Annual Dental Checkup',
        description: 'Call dentist clinic and book routine hygiene cleaning appointment.',
        priority: 'Low',
        category: 'Other',
        status: 'Completed',
        dueDate: new Date(now.getTime() - 4 * oneDay),
        completedAt: new Date(now.getTime() - 3 * oneDay)
      },
      {
        user: demoUser.id,
        title: 'Prepare Presentation Slides for Seminar',
        description: 'Create 15-minute deck covering Node.js event loop architecture and performance tuning.',
        priority: 'High',
        category: 'College',
        status: 'Pending',
        dueDate: new Date(now.getTime() + 5 * oneDay)
      }
    ];

    await Task.insertMany(sampleTasks);
    console.log(`✨ Successfully seeded ${sampleTasks.length} sample tasks!`);

    console.log('\n=======================================');
    console.log('🎉 Seed Complete! You can log in with:');
    console.log('   Email:    demo@example.com');
    console.log('   Password: password123');
    console.log('=======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
