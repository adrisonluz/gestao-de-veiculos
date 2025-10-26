"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config"); // Load environment variables
const firebase_1 = require("./firebase");
const firestore_1 = require("firebase/firestore");
const mock_data_1 = require("./mock-data");
async function seedDatabase() {
    try {
        // Seed clients
        for (const client of mock_data_1.mockClients) {
            const { vehicles } = client, clientData = __rest(client, ["vehicles"]);
            await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firestore_1.collection)(firebase_1.db, 'clients'), client.id), clientData);
            for (const vehicle of vehicles) {
                await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firestore_1.collection)(firebase_1.db, 'vehicles'), vehicle.id), vehicle);
            }
        }
        // Seed financial records
        for (const record of mock_data_1.mockFinancials) {
            const recordWithTimestamp = Object.assign(Object.assign({}, record), { date: firestore_1.Timestamp.fromDate(record.date) });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firestore_1.collection)(firebase_1.db, 'financials'), record.id), recordWithTimestamp);
        }
        console.log('Database seeded successfully!');
    }
    catch (error) {
        console.error('Error seeding database:', error);
    }
}
seedDatabase();
