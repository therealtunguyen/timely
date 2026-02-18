import { nanoid } from 'nanoid'

/** Generate a 10-character URL-safe ID (~73 bits entropy). Use for all DB primary keys. */
export const generateId = () => nanoid(10)
