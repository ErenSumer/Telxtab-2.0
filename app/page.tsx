"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Globe,
  Sparkles,
  Zap,
  Target,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  Play,
  Pause,
  MousePointer2,
  ArrowUpRight,
} from "lucide-react";
import Footer from "@/components/layouts/footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/ui/loading";
import LandingNavbar from "@/components/layouts/landing-navbar";

export default function Home() {
  // State for the page
  const [activeSection, setActiveSection] = useState("hero");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sectionProgress, setSectionProgress] = useState({
    languages: 0,
    features: 0,
    testimonials: 0,
    stats: 0,
    cta: 0,
  });

  // Authentication and navigation
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Auto-advance testimonials
  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isPlaying]);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Height of the navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      // Calculate overall scroll progress
      const scrollTop = window.scrollY;
      const docHeight = document.body.offsetHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollTop / (docHeight - winHeight);
      setScrollProgress(scrollPercent);

      // Update active section based on scroll
      const sections = [
        "hero",
        "languages",
        "features",
        "testimonials",
        "stats",
        "cta",
      ];
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { top, bottom } = element.getBoundingClientRect();
          if (top <= scrollPosition && bottom >= scrollPosition) {
            setActiveSection(section);
            break;
          }
        }
      }

      // Update section progress on scroll
      const sectionsList = [
        "languages",
        "features",
        "testimonials",
        "stats",
        "cta",
      ];
      const newSectionProgress = { ...sectionProgress };

      sectionsList.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const progress = Math.max(
            0,
            Math.min(
              1,
              (windowHeight - rect.top) / (windowHeight + rect.height)
            )
          );
          if (section in sectionProgress) {
            newSectionProgress[section as keyof typeof sectionProgress] =
              progress;
          }
        }
      });

      setSectionProgress(newSectionProgress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionProgress]);

  useEffect(() => {
    if (user) {
      setIsRedirecting(true);
      router.push("/dashboard");
    }
  }, [user, router]);

  if (loading || isRedirecting) {
    return <LoadingScreen />;
  }

  // Content for the page
  const languages = [
    { name: "Spanish", flag: "🇪🇸", users: "230M+" },
    { name: "French", flag: "🇫🇷", users: "175M+" },
    { name: "German", flag: "🇩🇪", users: "120M+" },
    { name: "Japanese", flag: "🇯🇵", users: "110M+" },
    { name: "Mandarin", flag: "🇨🇳", users: "280M+" },
    { name: "Italian", flag: "🇮🇹", users: "90M+" },
  ];

  const features = [
    {
      title: "Interactive Lessons",
      description:
        "Engaging lessons designed by language experts to keep you motivated.",
      icon: <Zap className="h-6 w-6 text-primary" />,
    },
    {
      title: "Personalized Learning",
      description: "AI-powered system adapts to your learning style and pace.",
      icon: <Users className="h-6 w-6 text-primary" />,
    },
    {
      title: "Real Conversations",
      description: "Practice with AI tutors that sound like native speakers.",
      icon: <Globe className="h-6 w-6 text-primary" />,
    },
    {
      title: "Progress Tracking",
      description:
        "Track your learning journey with detailed analytics and insights.",
      icon: <Target className="h-6 w-6 text-primary" />,
    },
  ];
const fonksiyon1 = ()=>{
  router.push("/auth/login")
}
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Student",
      content:
        "Telxtab made learning Spanish fun and engaging. I went from beginner to conversational in just 3 months!",
      avatar: "/testimonial-1.jpg",
    },
    {
      name: "Michael Chen",
      role: "Business Professional",
      content:
        "The personalized approach helped me learn Japanese for business much faster than traditional methods.",
      avatar: "/testimonial-2.jpg",
    },
    {
      name: "Emma Rodriguez",
      role: "Traveler",
      content:
        "I used Telxtab to learn Italian before my trip to Rome. The practical vocabulary was incredibly useful!",
      avatar: "/testimonial-3.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <LandingNavbar />

      {/* Scroll Progress Bar - Fixed implementation */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 origin-left z-50"
        style={{ scaleX: scrollProgress }}
      />

      {/* Section Progress Indicators */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 hidden lg:block space-y-4">
        {Object.entries(sectionProgress).map(([section, progress]) => (
          <div key={section} className="relative">
            <div className="w-1 h-16 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="w-full bg-gradient-to-b from-purple-500 to-pink-500 origin-bottom"
                style={{ scaleY: progress }}
              />
            </div>
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </div>
          </div>
        ))}
      </div>

      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#ec4899)] opacity-20 mix-blend-multiply filter blur-xl" />
      </div>

      {/* Floating Navigation */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-4">
          {[
            "hero",
            "languages",
            "features",
            "testimonials",
            "stats",
            "cta",
          ].map((section) => (
            <button
              key={section}
              onClick={() => scrollToSection(section)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeSection === section
                  ? "bg-purple-500 scale-125"
                  : "bg-gray-600 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{
            y: [0, 10, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <MousePointer2 className="w-6 h-6 text-purple-400" />
        </motion.div>
        <div className="text-sm text-gray-400 mt-2">Scroll to explore</div>
      </motion.div>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center px-4 pt-16"
      >
        <div className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
              AI-Powered Language Learning
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient">
              Master Any Language
              <br />
              <span className="text-4xl md:text-6xl">With AI Magic</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience the future of language learning with our cutting-edge
              AI platform. Personalized lessons, real-time feedback, and
              immersive practice await you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
              onClick={fonksiyon1}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-6 rounded-full shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
              >
                Start Learning Now <ArrowRight className="ml-2" />
              </Button>
              <Button
              
                size="lg"
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-lg px-8 py-6 rounded-full transition-all duration-300"
              >
              <a href="https://youtu.be/OVvCmkvHd2s">Watch Demo</a>
              
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Languages Section */}
      <section id="languages" className="py-20 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              Languages You Can Learn
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choose from over 25 languages with detailed courses crafted by
              linguistic experts.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {languages.map((language, index) => (
              <motion.div
                key={language.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="group relative"
              >
                <Card className="p-6 bg-gray-900/50 backdrop-blur-lg border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                  <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    {language.flag}
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {language.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {language.users} learners
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              View All Languages
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              Why Choose Our Platform?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Experience the most advanced language learning platform powered by
              cutting-edge AI technology.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <Card className="p-6 bg-gray-900/50 backdrop-blur-lg border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                  <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-5 h-5 text-purple-400" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              What Our Learners Say
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Join thousands of satisfied learners who have achieved their
              language goals.
            </p>
          </motion.div>

          <div className="relative max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-8 border border-gray-800"
              >
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl">
                    {testimonials[currentTestimonial].name[0]}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-semibold">
                      {testimonials[currentTestimonial].name}
                    </h3>
                    <p className="text-gray-400">
                      {testimonials[currentTestimonial].role}
                    </p>
                  </div>
                </div>
                <p className="text-gray-300 italic mb-6">
                  &ldquo;{testimonials[currentTestimonial].content}&rdquo;
                </p>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center mt-8 space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() =>
                  setCurrentTestimonial(
                    (prev) =>
                      (prev - 1 + testimonials.length) % testimonials.length
                  )
                }
                className="p-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentTestimonial(
                    (prev) => (prev + 1) % testimonials.length
                  )
                }
                className="p-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 px-4 relative">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: "1M+",
                label: "Active Users",
                icon: <Users className="w-8 h-8" />,
                gradient: "from-blue-500 to-purple-500",
              },
              {
                number: "50+",
                label: "Languages",
                icon: <Globe className="w-8 h-8" />,
                gradient: "from-purple-500 to-pink-500",
              },
              {
                number: "95%",
                label: "Success Rate",
                icon: <Target className="w-8 h-8" />,
                gradient: "from-pink-500 to-red-500",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="text-center group"
              >
                <div className="inline-block p-4 rounded-full bg-purple-500/10 mb-4 group-hover:bg-purple-500/20 transition-colors">
                  {stat.icon}
                </div>
                <h3
                  className={`text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${stat.gradient}`}
                >
                  {stat.number}
                </h3>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 px-4 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="container mx-auto text-center"
        >
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Ready to Start Your Language Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are already mastering new languages
            with our AI platform.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
            onClick={fonksiyon1}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-6 rounded-full shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
            >
              Create Free Account <Zap className="ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
