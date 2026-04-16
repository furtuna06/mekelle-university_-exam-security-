import React from 'react';
import { motion } from 'motion/react';
import { Info, Scan, BrainCircuit, ShieldCheck } from 'lucide-react';

export default function AlgorithmInfo() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Algorithm Explanation</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Our system utilizes a multi-stage pipeline for high-integrity examination security. 
          Below are the core algorithms that power the detection and recognition engines.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Scan size={24} />
          </div>
          <h3 className="text-xl font-semibold">Viola–Jones Algorithm</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Used for <strong>Face Detection</strong>. It works by scanning the image for "Haar-like features" 
            (simple rectangular patterns of dark and light pixels). 
            It uses an <em>Integral Image</em> for fast computation and an <em>AdaBoost</em> 
            cascade of classifiers to quickly discard non-face regions, making it efficient for real-time use.
          </p>
          <div className="pt-2">
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">Role: Detection & Localization</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <BrainCircuit size={24} />
          </div>
          <h3 className="text-xl font-semibold">LBPH Algorithm</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong>Local Binary Patterns Histograms</strong> is used for <strong>Face Recognition</strong>. 
            It labels the pixels of an image by thresholding the neighborhood of each pixel and considers 
            the result as a binary number. It then generates a histogram of these patterns to create a 
            unique "fingerprint" of the face that is robust to lighting changes.
          </p>
          <div className="pt-2">
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">Role: Feature Extraction & Matching</span>
          </div>
        </motion.div>
      </div>

      <div className="bg-gray-900 text-white p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-emerald-400" />
          <h3 className="text-xl font-semibold">System Transparency & Verification</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Unlike "Black Box" systems, our system provides transparency by showing 
          <strong> Confidence Scores</strong> and <strong>Similarity Results</strong>. 
          When a student is identified, the system reports the mathematical distance 
          between the live scan and the stored template, allowing invigilators to 
          verify the system's decision-making process.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl font-bold text-emerald-400">0.0 - 1.0</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Distance Scale</div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl font-bold text-blue-400">&lt; 0.6</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Match Threshold</div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl font-bold text-purple-400">Real-time</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Feedback Loop</div>
          </div>
        </div>
      </div>
    </div>
  );
}
