const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes require authentication
router.use(protect);

router.get('/stats', getTaskStats);
router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);

module.exports = router;
