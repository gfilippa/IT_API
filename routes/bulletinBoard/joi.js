const Joi = require('joi')

const deleteAnnouncementsQuerySchema = Joi.object().keys({
  fields: Joi.object().keys({
    publisher: Joi.string(),
    _about: Joi.string()
  }).required().allow(null),
  filters: Joi.object().keys({
    _about: Joi.string(),
    start: Joi.string(),
    end: Joi.string()
  }).required().with('end', 'start').allow(null)
})

const getAnnouncementFeedSchema = Joi.object().keys({
  type: Joi.string().valid('rss', 'atom', 'json').required(),
  categoryIds: Joi.any().allow()
})

const newAnnouncementsQuerySchema = Joi.object().keys({
  title: Joi.string().trim().min(1).max(80).required(),
  titleEn: Joi.string().trim().min(1).max(80).allow(''),
  text: Joi.string().max(12000).allow(''),
  textEn: Joi.string().max(12000).allow(''),
  about: Joi.required(),
  publisher: Joi.object().keys({
    publisherId: Joi.string(),
    publisherName: Joi.string()
  }).allow()
})

const editAnnouncementsQuerySchema = Joi.object().keys({
  title: Joi.string().trim().min(1).max(250).required(),
  titleEn: Joi.string().trim().min(1).max(250).allow(''),
  text: Joi.string().max(9000).allow(''),
  textEn: Joi.string().max(9000).allow(''),
  about: Joi.allow()
})

const newCategorySchema = Joi.object().keys({
  categoryTitle: Joi.string().min(1).max(60).required(),
  publicCategory: Joi.boolean().required(),
  wid: Joi.number().integer()
})

const editCategorySchemaBody = Joi.object().keys({
  name: Joi.string().min(1).max(60).required(),
  publicCategory: Joi.boolean().required(),
  wid: Joi.number().integer()
})

const registerCategoriesSchema = Joi.object().keys({
  addCat: Joi.array().allow(),
  removeCat: Joi.array().allow()
})

module.exports = {
  deleteAnnouncementsQuerySchema,
  newAnnouncementsQuerySchema,
  editAnnouncementsQuerySchema,
  newCategorySchema,
  editCategorySchemaBody,
  registerCategoriesSchema,
  getAnnouncementFeedSchema
}
