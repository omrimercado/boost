import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRouter from './routes/auth.routes';
import inviteRouter from './routes/invite.routes';
import sessionRouter from './routes/session.routes';
import setRouter from './routes/set.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/invites', inviteRouter);
app.use('/sessions', sessionRouter);
app.use('/sets', setRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
});

export default app;
