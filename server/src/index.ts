import express from "express";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from "dotenv";

import { categoryRouter } from './routes/category.route.js';
import { expenseEntryRouter } from './routes/expense-entry.route.js';
import { financialDataRouter } from './routes/financial-data.route.js';
import { permissionRouter } from './routes/permission.route.js';
import { projectRouter } from './routes/project.route.js';
import { roleRouter } from './routes/role.route.js'
import { userRouter } from './routes/user.route.js'
import { authRouter } from './routes/auth.routes.js';

export const app = express()
dotenv.config();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());


app.use('/api', categoryRouter);
app.use('/api', expenseEntryRouter);
app.use('/api', financialDataRouter);
app.use('/api', permissionRouter);
app.use('/api', projectRouter);
app.use('/api', roleRouter);
app.use('/api', userRouter);
app.use('/api/auth', authRouter);

const PORT = process.env.PORT;
export const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
