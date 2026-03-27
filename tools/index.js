import { findBySpecialtyHandler, findBySpecialtySchema } from './findBySpecialty.js';
import { getBusinessDetailsHandler, getBusinessDetailsSchema } from './getBusinessDetails.js';
import { getLatestDraftClassHandler, getLatestDraftClassSchema } from './getLatestDraftClass.js';
import { listCategoriesHandler, listCategoriesSchema } from './listCategories.js';
import { listNeighborhoodsHandler, listNeighborhoodsSchema } from './listNeighborhoods.js';
import { searchBusinessesHandler, searchBusinessesSchema } from './searchBusinesses.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'search_businesses',
    description: searchBusinessesSchema.description,
    inputSchema: searchBusinessesSchema.inputSchema,
    handler: searchBusinessesHandler,
  },
  {
    name: 'get_business_details',
    description: getBusinessDetailsSchema.description,
    inputSchema: getBusinessDetailsSchema.inputSchema,
    handler: getBusinessDetailsHandler,
  },
  {
    name: 'list_categories',
    description: listCategoriesSchema.description,
    inputSchema: listCategoriesSchema.inputSchema,
    handler: listCategoriesHandler,
  },
  {
    name: 'list_neighborhoods',
    description: listNeighborhoodsSchema.description,
    inputSchema: listNeighborhoodsSchema.inputSchema,
    handler: listNeighborhoodsHandler,
  },
  {
    name: 'get_latest_draft_class',
    description: getLatestDraftClassSchema.description,
    inputSchema: getLatestDraftClassSchema.inputSchema,
    handler: getLatestDraftClassHandler,
  },
  {
    name: 'find_by_specialty',
    description: findBySpecialtySchema.description,
    inputSchema: findBySpecialtySchema.inputSchema,
    handler: findBySpecialtyHandler,
  },
];

export const TOOL_MAP = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));
