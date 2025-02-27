"use server";

import { MongoClient }  from 'mongodb';
import { NextResponse } from 'next/server'

// import client from "@lib/mongodb";

export async function GET(req){
  if (req.method === "GET") {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
      await client.connect();

      // Choose a name for your database
      const database =  client.db(process.env.MONGODB_NAME);

      // Choose a name for your collection
      const collection =  database.collection("Questions");
      const allData = await collection.find({}).toArray();
      return NextResponse.json(allData);
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
      await client.close();
    }
  } else {
    NextResponse.json({ message: "Method not allowed!" });
  }
}
