import request from 'supertest';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import type { Session, Participant, Story } from '@shared/types';
export declare const createTestApp: () => import("express-serve-static-core").Express;
export declare const createTestServerWithSocket: () => {
    app: import("express-serve-static-core").Express;
    server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
};
export declare const createTestSession: (overrides?: Partial<Session>) => Session;
export declare const createTestParticipant: (overrides?: Partial<Participant>) => Participant;
export declare const createTestStory: (overrides?: Partial<Story>) => Story;
export declare const apiRequest: (app: express.Application) => import("supertest/lib/agent.js")<request.SuperTestStatic.Test>;
export declare const createSocketClient: (port: number) => any;
//# sourceMappingURL=test-helpers.d.ts.map