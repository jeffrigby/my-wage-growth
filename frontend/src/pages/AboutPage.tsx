import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { ANIMATION_VARIANTS, COUNTRIES } from '../constants';

export const AboutPage: React.FC = () => {
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
          Understanding Real Wage Growth
        </h1>
        <p className="text-xl text-secondary max-w-2xl mx-auto">
          Learn how inflation affects your purchasing power and why tracking real wages matters for your financial future.
        </p>
      </motion.section>

      {/* What is Real Wage Growth */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-chart-line text-primary"></i>
          <span>What is Real Wage Growth?</span>
        </h2>
        
        <div className="space-y-6">
          <p className="text-lg text-secondary leading-relaxed">
            Real wage growth measures how your purchasing power changes over time by adjusting your nominal wages for inflation. 
            It answers the crucial question: "Can I buy more or less with my paycheck today compared to the past?"
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-accent">
                <i className="fas fa-dollar-sign mr-2"></i>
                Nominal Wages
              </h3>
              <p className="text-secondary">
                The actual dollar amount you earn. A $50,000 salary in 2020 vs $55,000 in 2024 shows 10% nominal growth.
              </p>
            </div>
            
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-primary">
                <i className="fas fa-shopping-cart mr-2"></i>
                Real Wages
              </h3>
              <p className="text-secondary">
                Your purchasing power adjusted for inflation. If inflation was 15% over that period, your real wages actually decreased by 5%.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* How CPI Works */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-calculator text-accent"></i>
          <span>How We Calculate It</span>
        </h2>
        
        <div className="space-y-6">
          <p className="text-lg text-secondary leading-relaxed">
            We use the Consumer Price Index (CPI) from official government sources to measure inflation and adjust your wages accordingly.
          </p>
          
          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">The Formula</h3>
            <div className="bg-background rounded-lg p-4 font-mono text-sm">
              <div className="text-center">
                <div className="text-lg mb-2">Real Wage = Nominal Wage × (Current CPI ÷ Past CPI)</div>
                <div className="text-muted text-xs">
                  Example: $50,000 × (310.3 ÷ 258.8) = $59,940 in today's dollars
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {Object.values(COUNTRIES).map((country) => (
              <div key={country.code} className="bg-surface rounded-lg p-4 text-center">
                <i className={`fas ${country.flag} text-2xl mb-2 text-primary`}></i>
                <h4 className="font-semibold">{country.name}</h4>
                <p className="text-sm text-muted">{country.cpiSource}</p>
                <p className="text-xs text-muted mt-1">{country.cpiDescription}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Why It Matters */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-lightbulb text-warning"></i>
          <span>Why This Matters</span>
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-accent">For Your Career</h3>
            <ul className="space-y-2 text-secondary">
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-accent mt-1"></i>
                <span>Negotiate raises that beat inflation</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-accent mt-1"></i>
                <span>Evaluate job offers in real terms</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-accent mt-1"></i>
                <span>Track career progression accurately</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-accent mt-1"></i>
                <span>Plan career moves strategically</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">For Your Finances</h3>
            <ul className="space-y-2 text-secondary">
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-primary mt-1"></i>
                <span>Set realistic savings goals</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-primary mt-1"></i>
                <span>Plan for retirement needs</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-primary mt-1"></i>
                <span>Understand investment requirements</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-primary mt-1"></i>
                <span>Make informed spending decisions</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Important Notes */}
      <motion.section
        className="glass-card p-8 border-l-4 border-warning"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center space-x-3">
          <i className="fas fa-exclamation-triangle text-warning"></i>
          <span>Important Notes</span>
        </h2>
        
        <div className="space-y-4 text-secondary">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-info mt-1"></i>
            <div>
              <h4 className="font-semibold">Use Pre-Tax Wages</h4>
              <p>Always enter your gross (pre-tax) wages for accurate comparisons, as tax rates change over time.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <i className="fas fa-calendar-alt text-accent mt-1"></i>
            <div>
              <h4 className="font-semibold">Consistent Time Periods</h4>
              <p>Compare similar time periods (annual to annual, monthly to monthly) for meaningful results.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <i className="fas fa-chart-bar text-primary mt-1"></i>
            <div>
              <h4 className="font-semibold">Educational Tool</h4>
              <p>This calculator provides estimates for educational purposes. Consult financial professionals for investment decisions.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="text-center"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Analyze Your Wage Growth?</h2>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            Start tracking your real wage growth today and make more informed career and financial decisions.
          </p>
          <Link 
            to="/"
            className="btn-primary px-8 py-3 rounded-lg inline-flex items-center space-x-2"
          >
            <i className="fas fa-calculator"></i>
            <span>Start Calculating</span>
          </Link>
        </div>
      </motion.section>
    </motion.div>
  );
};