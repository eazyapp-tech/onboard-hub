'use client'

import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-red-50 to-orange-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 text-center">
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }} 
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-red-600">Access Denied</h1>
            <p className="text-muted-foreground">Unauthorized email domain</p>
          </motion.div>

          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Mail className="w-4 h-4" />
              <span>Only these domains are allowed:</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                @eazyapp.tech
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                @rentok.com
              </span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              Your email domain is not authorized to access this application. 
              Please contact your administrator if you believe this is an error.
            </p>
          </div>

          <Link href="/auth/signin">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Try Different Account</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
