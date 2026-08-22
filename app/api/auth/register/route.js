import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = signToken(user._id);

    return NextResponse.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
