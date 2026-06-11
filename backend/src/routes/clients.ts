import { Router } from 'express';

import { z } from 'zod';

import { v4 as uuidv4 } from 'uuid';

import { authenticate, authorize } from '../middleware/auth';

import { query, queryOne } from '../db/pool';

import { parsePagination, buildPaginationMeta } from '../utils/pagination';

import { AppError } from '../middleware/errorHandler';

import type { Client, ClientObject } from '../models/types';

import { clientObjectInputSchema } from '../schemas/clientObject';
import { optionalEmail, optionalString } from '../schemas/fields';

import { insertClientObject, listClientObjects, syncClientObjects } from '../services/clientObjects';



export const clientsRouter = Router();

clientsRouter.use(authenticate);



const clientSchema = z.object({

  name: z.string().min(1).max(255),

  client_type: z.enum(['company', 'private']).default('company'),

  address: optionalString,

  city: optionalString,

  postal_code: optionalString,

  country: z.string().length(2).default('LV'),

  latitude: z.number().min(-90).max(90).optional(),

  longitude: z.number().min(-180).max(180).optional(),

  phone: optionalString,

  email: optionalEmail,

  representative: optionalString,

  notes: optionalString,

});



const createClientSchema = clientSchema.extend({

  objects: z.array(clientObjectInputSchema).optional(),

});



const updateClientSchema = clientSchema.partial().extend({

  objects: z.array(clientObjectInputSchema).optional(),

});



type ClientRow = Client & { object_count?: number };



/** GET /clients — saraksts ar filtriem */

clientsRouter.get('/', async (req, res, next) => {

  try {

    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });

    const search = req.query.search as string | undefined;

    const city = req.query.city as string | undefined;



    let where = 'WHERE c.is_active = 1';

    const params: unknown[] = [];



    if (search) {

      where += ` AND (
        c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
        OR EXISTS (
          SELECT 1 FROM client_objects co
          WHERE co.client_id = c.id AND co.is_active = 1 AND co.status = 'active'
          AND (
            co.name LIKE ? OR co.address LIKE ? OR co.city LIKE ?
            OR co.object_code LIKE ?
          )
        )
      )`;

      const term = `%${search}%`;

      params.push(term, term, term, term, term, term, term);

    }

    if (city) {

      where += ' AND c.city = ?';

      params.push(city);

    }



    const countRow = await queryOne<{ total: number }>(

      `SELECT COUNT(*) as total FROM clients c ${where}`,

      params

    );

    const total = countRow?.total ?? 0;



    const clients = await query<ClientRow>(

      `SELECT c.*,

        (SELECT COUNT(*) FROM client_objects co

         WHERE co.client_id = c.id AND co.is_active = 1 AND co.status = 'active') AS object_count

       FROM clients c ${where}

       ORDER BY c.name ASC LIMIT ? OFFSET ?`,

      [...params, limit, offset]

    );



    res.json({

      data: clients,

      pagination: buildPaginationMeta(total, page, limit),

    });

  } catch (err) {

    next(err);

  }

});



/** GET /clients/:id */

clientsRouter.get('/:id', async (req, res, next) => {

  try {

    const client = await queryOne<Client>(

      'SELECT * FROM clients WHERE id = ? AND is_active = 1',

      [req.params.id]

    );

    if (!client) throw new AppError(404, 'Client not found', 'NOT_FOUND');



    const objects = await listClientObjects(req.params.id, 'active');

    const closed_objects = await listClientObjects(req.params.id, 'closed');

    res.json({ data: { ...client, objects, closed_objects } });

  } catch (err) {

    next(err);

  }

});



/** POST /clients — var uzreiz pievienot objektus */

clientsRouter.post('/', authorize('admin', 'manager', 'technician'), async (req, res, next) => {

  try {

    const body = createClientSchema.parse(req.body);

    const { objects, ...clientFields } = body;

    const id = uuidv4();



    await query(

      `INSERT INTO clients (id, name, client_type, address, city, postal_code, country,

        latitude, longitude, phone, email, representative, notes, created_by)

       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

      [

        id,

        clientFields.name,

        clientFields.client_type,

        clientFields.address ?? null,

        clientFields.city ?? null,

        clientFields.postal_code ?? null,

        clientFields.country,

        clientFields.latitude ?? null,

        clientFields.longitude ?? null,

        clientFields.phone ?? null,

        clientFields.email || null,

        clientFields.representative ?? null,

        clientFields.notes ?? null,

        req.user?.userId,

      ]

    );



    let savedObjects: ClientObject[] = [];

    if (objects?.length) {

      savedObjects = await syncClientObjects(id, objects, req.user?.userId);

    } else if (clientFields.address || clientFields.city) {

      savedObjects = [

        await insertClientObject(

          id,

          {

            name: clientFields.name,

            address: clientFields.address,

            city: clientFields.city,

            postal_code: clientFields.postal_code,

            country: clientFields.country,

            latitude: clientFields.latitude,

            longitude: clientFields.longitude,

            contact_phone: clientFields.phone,

            contact_email: clientFields.email,

            is_primary: true,

          },

          req.user?.userId

        ),

      ];

    }



    const client = await queryOne<Client>('SELECT * FROM clients WHERE id = ?', [id]);

    res.status(201).json({ data: { ...client, objects: savedObjects } });

  } catch (err) {

    next(err);

  }

});



/** PUT /clients/:id — atjaunina klientu un/vai objektus */

clientsRouter.put('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {

  try {

    const body = updateClientSchema.parse(req.body);

    const { objects, ...clientFields } = body;

    const existing = await queryOne('SELECT id FROM clients WHERE id = ? AND is_active = 1', [

      req.params.id,

    ]);

    if (!existing) throw new AppError(404, 'Client not found');



    const fields = Object.keys(clientFields);

    if (fields.length > 0) {

      const setClause = fields.map((f) => `${f} = ?`).join(', ');

      await query(

        `UPDATE clients SET ${setClause} WHERE id = ?`,

        [

          ...fields.map((f) => {

            const v = (clientFields as Record<string, unknown>)[f];

            if (f === 'email' && v === '') return null;

            return v ?? null;

          }),

          req.params.id,

        ]

      );

    }



    let savedObjects;

    if (objects) {

      savedObjects = await syncClientObjects(req.params.id, objects, req.user?.userId);

    } else {

      savedObjects = await listClientObjects(req.params.id);

    }



    const client = await queryOne<Client>('SELECT * FROM clients WHERE id = ?', [req.params.id]);

    res.json({ data: { ...client, objects: savedObjects } });

  } catch (err) {

    next(err);

  }

});



/** DELETE /clients/:id — soft delete */

clientsRouter.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {

  try {

    await query('UPDATE clients SET is_active = 0 WHERE id = ?', [req.params.id]);

    await query('UPDATE client_objects SET is_active = 0 WHERE client_id = ?', [req.params.id]);

    res.json({ success: true });

  } catch (err) {

    next(err);

  }

});


