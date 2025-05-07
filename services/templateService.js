const { prisma } = require('../prisma'); 
const logger = require('../utils/logger');

const createTemplate = async ({ name, htmlContent }) => {
  try {
    if (!name || !htmlContent) {
      throw new Error('Name and HTML content are required');
    }

    // Create the template in the database
    const template = await prisma.template.create({
      data: {
        name,
        htmlContent,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info(`Template created: ${template.name} (ID: ${template.id})`);
    return template;
  } catch (error) {
    logger.error('Error creating template:', error);
    throw new Error(`Failed to create template: ${error.message}`);
  }
};

// Retrieve a template by ID
const getTemplateById = async (templateId) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(templateId) },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  } catch (error) {
    logger.error('Error retrieving template:', error);
    throw new Error(`Failed to retrieve template: ${error.message}`);
  }
};

// Retrieve all templates
const getAllTemplates = async () => {
  try {
    const templates = await prisma.template.findMany();
    return templates;
  } catch (error) {
    logger.error('Error retrieving all templates:', error);
    throw new Error(`Failed to retrieve templates: ${error.message}`);
  }
};

module.exports = {
  createTemplate,
  getTemplateById,
  getAllTemplates,
};