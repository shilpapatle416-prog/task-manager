const Task = require('../models/Task');

/**
 * @desc    Get all tasks for current user with search, filter, sort & pagination
 * @route   GET /api/tasks
 * @access  Private
 */
exports.getTasks = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      isOverdue,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Base query scoped strictly to the authenticated user
    const query = { user: req.user._id };

    // Search by title or description
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Filter by status
    if (status && status !== 'All') {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter overdue tasks specifically
    if (isOverdue === 'true') {
      query.status = { $ne: 'Completed' };
      query.dueDate = { $lt: new Date() };
    }

    // Sorting
    let sort = {};
    const order = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'dueDate':
        // Put tasks without due date at the end
        sort = { dueDate: order, createdAt: -1 };
        break;
      case 'priority':
        // Custom priority sort logic handled or standard field sort
        sort = { priority: order, createdAt: -1 };
        break;
      case 'title':
        sort = { title: order };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: order };
        break;
    }

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = limit === 'all' ? 0 : parseInt(limit, 10) || 10;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

    const totalTasks = await Task.countDocuments(query);

    let tasksQuery = Task.find(query).sort(sort);
    if (limitNum > 0) {
      tasksQuery = tasksQuery.skip(skip).limit(limitNum);
    }

    let tasks = await tasksQuery;

    // Optional client-friendly priority sort ordering if requested
    if (sortBy === 'priority') {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      tasks = tasks.sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 0;
        const weightB = priorityWeight[b.priority] || 0;
        return order === 1 ? weightA - weightB : weightB - weightA;
      });
    }

    const totalPages = limitNum > 0 ? Math.ceil(totalTasks / limitNum) : 1;

    res.status(200).json({
      success: true,
      count: tasks.length,
      total: totalTasks,
      page: pageNum,
      totalPages,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard statistics for current user
 * @route   GET /api/tasks/stats
 * @access  Private
 */
exports.getTaskStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [
      total,
      completed,
      pending,
      inProgress,
      overdue,
      dueSoon,
      recentTasks,
      categoryStats
    ] = await Promise.all([
      Task.countDocuments({ user: userId }),
      Task.countDocuments({ user: userId, status: 'Completed' }),
      Task.countDocuments({ user: userId, status: 'Pending' }),
      Task.countDocuments({ user: userId, status: 'In Progress' }),
      Task.countDocuments({
        user: userId,
        status: { $ne: 'Completed' },
        dueDate: { $ne: null, $lt: now }
      }),
      Task.countDocuments({
        user: userId,
        status: { $ne: 'Completed' },
        dueDate: { $gte: now, $lte: in48Hours }
      }),
      Task.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
      Task.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        total,
        completed,
        pending,
        inProgress,
        overdue,
        dueSoon,
        completionPercentage,
        categoryStats,
        recentTasks
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you are not authorized to view it.'
      });
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, priority, category, status, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Medium',
      category: category || 'Personal',
      status: status || 'Pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: status === 'Completed' ? new Date() : null
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you do not have permission to edit it.'
      });
    }

    const { title, description, priority, category, status, dueDate } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

    if (status !== undefined) {
      task.status = status;
      if (status === 'Completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== 'Completed') {
        task.completedAt = null;
      }
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you do not have permission to delete it.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Patch task status (e.g. quick toggle or status change)
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status: Pending, In Progress, or Completed.'
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    task.status = status;
    task.completedAt = status === 'Completed' ? new Date() : null;

    await task.save();

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}.`,
      task
    });
  } catch (error) {
    next(error);
  }
};
