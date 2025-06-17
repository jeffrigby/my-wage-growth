import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ANIMATION_VARIANTS } from '../constants';

export const SharedResultsPage: React.FC = () => {
  const { encodedData } = useParams<{ encodedData: string }>();

  // TODO: Decode and display shared data
  // For now, show a placeholder

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8"
      initial={ANIMATION_VARIANTS.FADE_IN.initial}
      animate={ANIMATION_VARIANTS.FADE_IN.animate}
      exit={ANIMATION_VARIANTS.FADE_IN.exit}
    >
      {/* Header */}
      <motion.section
        className="text-center space-y-4"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gradient">
          Shared Wage Growth Analysis
        </h1>
        <p className="text-xl text-secondary max-w-2xl mx-auto">
          View someone's real wage growth over time, adjusted for inflation.
        </p>
      </motion.section>

      {/* Shared data display */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="text-center space-y-6">
          <div className="text-6xl text-muted">
            <i className="fas fa-share-alt"></i>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Shared Results Feature</h2>
            <p className="text-secondary">
              This feature will decode and display shared wage growth data from the URL.
            </p>
          </div>
          
          {encodedData && (
            <div className="bg-surface rounded-lg p-4">
              <h3 className="font-semibold mb-2">Encoded Data:</h3>
              <code className="text-sm text-muted break-all">
                {encodedData}
              </code>
            </div>
          )}
          
          <div className="space-y-4">
            <p className="text-muted">
              Coming Soon: Comprehensive wage growth visualization and analysis
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/"
                className="btn-primary px-6 py-3 rounded-lg inline-flex items-center justify-center space-x-2"
              >
                <i className="fas fa-calculator"></i>
                <span>Create Your Own Analysis</span>
              </Link>
              
              <Link 
                to="/about"
                className="btn-secondary px-6 py-3 rounded-lg inline-flex items-center justify-center space-x-2"
              >
                <i className="fas fa-info-circle"></i>
                <span>Learn More</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* How sharing works */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-info-circle text-primary"></i>
          <span>How Sharing Works</span>
        </h2>
        
        <div className="space-y-4 text-secondary">
          <div className="flex items-start space-x-3">
            <i className="fas fa-shield-alt text-accent mt-1"></i>
            <div>
              <h4 className="font-semibold">Privacy First</h4>
              <p>Your data is compressed and encoded directly in the URL. No data is stored on our servers.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <i className="fas fa-link text-primary mt-1"></i>
            <div>
              <h4 className="font-semibold">Shareable Links</h4>
              <p>Generate secure links to share your wage growth analysis with others, like during salary negotiations.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <i className="fas fa-eye text-warning mt-1"></i>
            <div>
              <h4 className="font-semibold">Read-Only View</h4>
              <p>Shared links display your results without allowing others to modify your data.</p>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
};