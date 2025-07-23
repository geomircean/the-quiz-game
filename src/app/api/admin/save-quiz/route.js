'use server';
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { connectToDb } from '@/lib/connect-to-db';

export async function POST(req) {
  if (req.method !== 'POST') {
    NextResponse.json({ message: 'Method not allowed!' });
  }
  const { database, client } = await connectToDb();
  const quizQuestions = await req.json();

  try {
    const Quizzes = database.collection('Quizzes');

    const { insertedId } = await Quizzes.insertOne({
      quizQuestions,
      quizName: 'Test Quiz',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, (err, res) => {
      if (err) return NextResponse.json({ message: err.message });
      console.log('Mongo response', res);
    });

    return NextResponse.json({ insertedId, status: 'success' });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  } finally {
    await client.close();
  }
}

export async function PUT(req) {
  if (req.method !== 'PUT') {
    NextResponse.json({ message: 'Method not allowed!' });
  }
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const database = client.db(process.env.MONGODB_NAME);

    // Choose a name for your collection
    const collection = database.collection('Questions');
    // const allData = await collection.find({}).toArray();
    const data = {
      description: 'This is a test question',
      category: 'Sweet Dreams take 2',
      possibleAnswers: [
        { answerMessage: 'this is answer A', isCorrect: false },
        { answerMessage: 'this is answer B', isCorrect: false },
        { answerMessage: 'this is answer C', isCorrect: true },
      ],
    };
    const response = await collection.insertOne(data, (err, res) => {
      if (err) return NextResponse.json({ message: err.message });
      console.log('Mongo response', res);
    });

    return NextResponse.json({ response });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  } finally {
    await client.close();
  }
}
