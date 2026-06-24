const asyncHandler = require('../utils/asyncHandler');
const Project      = require('../models/Project');
const { sendError } = require('../utils/ApiResponse');

/**
 * Checks that the logged-in user is either:
 *   - The project owner, OR
 *   - A member of the project
 *
 * Attaches req.project and req.projectRole for use in controllers.
 * Must be used AFTER protect middleware.
 */
const projectAccess = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id || req.body.project;

  if (!projectId) {
    return sendError(res, 400, 'Project ID is required.');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  // Admins bypass all project access checks
  if (req.user.role === 'admin') {
    req.project     = project;
    req.projectRole = 'admin';
    return next();
  }

  const isOwner = String(project.owner) === String(req.user._id);
  if (isOwner) {
    req.project     = project;
    req.projectRole = 'admin'; // owners have admin rights on their project
    return next();
  }

  const membership = project.members.find(
    (m) => String(m.user) === String(req.user._id)
  );

  if (!membership) {
    return sendError(res, 403, 'You are not a member of this project.');
  }

  req.project     = project;
  req.projectRole = membership.role;
  next();
});

/**
 * Ensures the user has admin or owner rights in the project.
 * Must be used AFTER projectAccess middleware.
 */
const projectAdmin = (req, res, next) => {
  if (req.projectRole !== 'admin' && req.user.role !== 'admin') {
    return sendError(res, 403, 'Only project admins can perform this action.');
  }
  next();
};

module.exports = { projectAccess, projectAdmin };
