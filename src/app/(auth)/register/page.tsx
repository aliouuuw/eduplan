'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">EduPlan</h1>
          <p className="mt-2 text-sm text-gray-600">School Management System</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-center">Invitation Required</CardTitle>
            <CardDescription className="text-center">
              Registration is by invitation only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">How to Join</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Request an invitation from your school administrator</li>
                  <li>Check your email for an invitation link</li>
                  <li>Click the link to create your account</li>
                  <li>Login with your new credentials</li>
                </ol>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>For School Administrators:</strong> If you're setting up a new school, 
                  contact our support team to get started.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Link href="/login" className="block">
                  <Button className="w-full">
                    Go to Login
                  </Button>
                </Link>
                <p className="text-center text-sm text-gray-600 mt-4">
                  Already have an invitation?{' '}
                  <span className="text-gray-900 font-medium">
                    Check your email for the invitation link
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
