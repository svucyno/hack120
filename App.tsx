/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, type ReactNode, type MouseEvent, type ChangeEvent } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { 
  FileText, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Zap, 
  ArrowRight, 
  Loader2,
  ChevronRight,
  Target,
  Award,
  Users,
  BrainCircuit,
  History,
  Trash2,
  Plus,
  Clock,
  Upload,
  FileUp,
  X,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Globe,
  Cpu,
  BarChart3,
  Mail,
  MessageSquare,
  Scan,
  LayoutDashboard,
  AlertTriangle,
  TableProperties,
  XCircle,
  Download,
  FileCheck,
  Wrench,
  RefreshCw,
  GraduationCap,
  Coins,
  Copy,
  Check,
  UserCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
import { auth, db, googleProvider } from "./firebase";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from "recharts";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  orderBy,
  getDocFromServer,
  Timestamp
} from "firebase/firestore";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// Error Handling Spec for Firestore
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface JDRequirements {
  years_of_experience: string;
  required_tools: string[];
  certifications: string[];
  key_responsibilities: string[];
}

interface SkillGap {
  skill: string;
  found: boolean;
  confidence: number;
  notes: string;
}

interface ResumeOptimization {
  original_text: string;
  optimized_text: string;
  reason: string;
  risk_level: 'Safe' | 'Review' | 'Caution';
  risk_reason: string;
}

// Types for the analysis result
interface AnalysisResult {
  compatibility_score: number;
  confidence_interval: number;
  ats_score: number;
  ats_issues: string[];
  bias_detected: boolean;
  bias_reasoning: string | null;
  score_breakdown: {
    semantic_similarity: number;
    keyword_coverage: number;
    industry_relevance: number;
    role_relevance: number;
    education_match: number;
    communication_quality: number;
  };
  matched_keywords: string[];
  missing_keywords: string[];
  skill_gaps: SkillGap[];
  summary_critique: string;
  actionable_tips: string[];
  optimized_bullet_point: string | null;
  jd_requirements: JDRequirements;
  optimizations: ResumeOptimization[];
  role_fit_archetype: 'Strong Match' | 'Upskillable' | 'Career Switcher' | 'Overqualified' | 'Weak Match';
  role_fit_reasoning: string;
  salary_benchmark: string | null;
  interview_questions: string[];
  candidate_snapshot: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  resume?: string;
  jobDescription: string;
  result?: AnalysisResult;
  leaderboardResults?: RankedCandidate[];
  extractedJD?: JDRequirements | null;
  userId?: string;
  linkedinUrl?: string | null;
  type: 'single' | 'leaderboard';
}

interface LeaderboardCandidate {
  id: string;
  name: string;
  resumeText: string;
  fileName: string;
}

interface RankedCandidate {
  rank: number;
  name: string;
  score: number;
  confidence_interval: number;
  ats_score: number;
  ats_issues: string[];
  bias_detected: boolean;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  score_breakdown: {
    semantic_similarity: number;
    keyword_coverage: number;
    industry_relevance: number;
    role_relevance: number;
    education_match: number;
    communication_quality: number;
  };
  matched_keywords: string[];
  missing_keywords: string[];
  skill_gaps: SkillGap[];
  jd_requirements?: JDRequirements;
  optimizations: ResumeOptimization[];
  role_fit_archetype: 'Strong Match' | 'Upskillable' | 'Career Switcher' | 'Overqualified' | 'Weak Match';
  role_fit_reasoning: string;
  salary_benchmark: string | null;
  interview_questions: string[];
  candidate_snapshot: string;
}

const SAMPLE_JDS = [
  {
    title: "Senior Software Engineer (Google)",
    content: "Minimum qualifications: Bachelor's degree in Computer Science, a related technical field, or equivalent practical experience. 5 years of experience in software development. Experience in Java, C++, or Python. Preferred qualifications: Master's degree or PhD in Computer Science or related technical field. Experience with large-scale distributed systems, networking, or security. Ability to work in a fast-paced environment."
  },
  {
    title: "Data Analyst (JPMorgan Chase)",
    content: "We are looking for a Data Analyst to join our team. Responsibilities: Interpret data, analyze results using statistical techniques and provide ongoing reports. Develop and implement databases, data collection systems, data analytics and other strategies that optimize statistical efficiency and quality. Requirements: Proven working experience as a Data Analyst. Technical expertise regarding data models, database design development, data mining and segmentation techniques. Strong knowledge of and experience with reporting packages (Tableau, PowerBI), SQL, and Python/R."
  },
  {
    title: "Product Manager (SaaS Startup)",
    content: "As a Product Manager, you will be responsible for the product planning and execution throughout the Product Lifecycle. Requirements: Minimum of 3 years experience as a Product Manager. Demonstrated success defining and launching excellent products. Knowledgeable in technology. Excellent written and verbal communication skills. Bachelor's degree (MBA preferred). Technical background, with experience in software development or web technologies."
  },
  {
    title: "UX Designer (Airbnb)",
    content: "Responsibilities: Design end-to-end user experiences for web and mobile. Create wireframes, prototypes, and high-fidelity designs. Conduct user research and usability testing. Requirements: 4+ years of experience in product design. Proficiency in Figma, Sketch, or Adobe XD. Strong portfolio demonstrating user-centered design principles. Experience with design systems and accessibility standards."
  },
  {
    title: "Cloud Architect (AWS)",
    content: "Responsibilities: Design and implement scalable, reliable, and secure cloud solutions. Provide technical leadership and guidance to development teams. Optimize cloud infrastructure for cost and performance. Requirements: 7+ years of experience in IT infrastructure. Deep understanding of AWS services (EC2, S3, RDS, Lambda). AWS Certified Solutions Architect Professional preferred. Strong knowledge of networking and security best practices."
  },
  {
    title: "HR Specialist (Deloitte)",
    content: "Responsibilities: Manage recruitment processes, employee relations, and performance management. Develop and implement HR policies and procedures. Support talent development and training initiatives. Requirements: 3+ years of experience in HR. Strong knowledge of employment laws and regulations. Excellent interpersonal and communication skills. Bachelor's degree in HR or related field."
  },
  {
    title: "Sales Executive (Salesforce)",
    content: "Responsibilities: Identify and qualify new sales opportunities. Conduct product demonstrations and presentations. Negotiate and close deals to meet sales targets. Requirements: 5+ years of experience in B2B sales, preferably in SaaS. Proven track record of exceeding sales quotas. Strong relationship-building and negotiation skills. Proficiency in CRM software."
  },
  {
    title: "Cyber Security Analyst (CrowdStrike)",
    content: "Responsibilities: Monitor and analyze security alerts and incidents. Conduct vulnerability assessments and penetration testing. Implement and manage security tools and technologies. Requirements: 3+ years of experience in cyber security. Knowledge of network security, cryptography, and incident response. Certifications such as CISSP, CEH, or CompTIA Security+ preferred."
  },
  {
    title: "Machine Learning Engineer (OpenAI)",
    content: "Responsibilities: Design and develop machine learning models and algorithms. Implement and optimize large-scale training pipelines. Collaborate with researchers to push the boundaries of AI. Requirements: 4+ years of experience in machine learning. Strong proficiency in Python and deep learning frameworks (PyTorch, TensorFlow). Experience with large language models and reinforcement learning. PhD or Master's in CS/AI preferred."
  },
  {
    title: "Marketing Manager (Shopify)",
    content: "Responsibilities: Develop and execute marketing strategies to drive merchant growth. Manage multi-channel marketing campaigns (email, social, content). Analyze marketing performance and optimize ROI. Requirements: 5+ years of experience in digital marketing. Strong understanding of SEO, SEM, and performance marketing. Experience with marketing automation tools and data analysis."
  }
];

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    compatibility_score: { type: Type.NUMBER },
    confidence_interval: { type: Type.INTEGER },
    ats_score: { type: Type.INTEGER },
    ats_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
    bias_detected: { type: Type.BOOLEAN },
    role_fit_archetype: { type: Type.STRING },
    role_fit_reasoning: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    score_breakdown: {
      type: Type.OBJECT,
      properties: {
        semantic_similarity: { type: Type.NUMBER },
        keyword_coverage: { type: Type.NUMBER },
        industry_relevance: { type: Type.NUMBER },
        role_relevance: { type: Type.NUMBER },
        education_match: { type: Type.NUMBER },
        communication_quality: { type: Type.NUMBER }
      },
      required: ["semantic_similarity", "keyword_coverage", "industry_relevance", "role_relevance", "education_match", "communication_quality"]
    },
    matched_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    missing_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    skill_gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          found: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          notes: { type: Type.STRING }
        },
        required: ["skill", "found", "confidence", "notes"]
      }
    },
    optimizations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original_text: { type: Type.STRING },
          optimized_text: { type: Type.STRING },
          reason: { type: Type.STRING },
          risk_level: { type: Type.STRING },
          risk_reason: { type: Type.STRING }
        },
        required: ["original_text", "optimized_text", "reason", "risk_level", "risk_reason"]
      }
    },
    jd_requirements: {
      type: Type.OBJECT,
      properties: {
        years_of_experience: { type: Type.STRING },
        required_tools: { type: Type.ARRAY, items: { type: Type.STRING } },
        certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
        key_responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["years_of_experience", "required_tools", "certifications", "key_responsibilities"]
    },
    salary_benchmark: { type: Type.STRING },
    interview_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
    candidate_snapshot: { type: Type.STRING }
  },
  required: ["compatibility_score", "confidence_interval", "ats_score", "ats_issues", "bias_detected", "role_fit_archetype", "role_fit_reasoning", "reasoning", "strengths", "weaknesses", "score_breakdown", "matched_keywords", "missing_keywords", "skill_gaps", "optimizations", "jd_requirements", "salary_benchmark", "interview_questions", "candidate_snapshot"]
};

const RANKING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rank: { type: Type.INTEGER },
          name: { type: Type.STRING },
          score: { type: Type.NUMBER },
          confidence_interval: { type: Type.INTEGER },
          ats_score: { type: Type.INTEGER },
          ats_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          bias_detected: { type: Type.BOOLEAN },
          reasoning: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          score_breakdown: {
            type: Type.OBJECT,
            properties: {
              semantic_similarity: { type: Type.NUMBER },
              keyword_coverage: { type: Type.NUMBER },
              industry_relevance: { type: Type.NUMBER },
              role_relevance: { type: Type.NUMBER },
              education_match: { type: Type.NUMBER },
              communication_quality: { type: Type.NUMBER }
            },
            required: ["semantic_similarity", "keyword_coverage", "industry_relevance", "role_relevance", "education_match", "communication_quality"]
          },
          matched_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          missing_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          skill_gaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                found: { type: Type.BOOLEAN },
                confidence: { type: Type.NUMBER },
                notes: { type: Type.STRING }
              },
              required: ["skill", "found", "confidence", "notes"]
            }
          },
          optimizations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original_text: { type: Type.STRING },
                optimized_text: { type: Type.STRING },
                reason: { type: Type.STRING },
                risk_level: { type: Type.STRING },
                risk_reason: { type: Type.STRING }
              },
              required: ["original_text", "optimized_text", "reason", "risk_level", "risk_reason"]
            }
          },
          role_fit_archetype: { type: Type.STRING },
          role_fit_reasoning: { type: Type.STRING },
          salary_benchmark: { type: Type.STRING },
          interview_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          candidate_snapshot: { type: Type.STRING }
        },
        required: ["rank", "name", "score", "confidence_interval", "ats_score", "ats_issues", "bias_detected", "reasoning", "strengths", "weaknesses", "score_breakdown", "matched_keywords", "missing_keywords", "skill_gaps", "optimizations", "role_fit_archetype", "role_fit_reasoning", "salary_benchmark", "interview_questions", "candidate_snapshot"]
      }
    },
    jd_requirements: {
      type: Type.OBJECT,
      properties: {
        years_of_experience: { type: Type.STRING },
        required_tools: { type: Type.ARRAY, items: { type: Type.STRING } },
        certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
        key_responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["years_of_experience", "required_tools", "certifications", "key_responsibilities"]
    }
  },
  required: ["candidates", "jd_requirements"]
};

const MODEL_NAME = "gemini-3-flash-preview";

const callGemini = async (prompt: string, schema: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      temperature: 0,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  return JSON.parse(response.text || "{}");
};

const getRankingPrompt = (candidates: LeaderboardCandidate[], jdText: string, isBlind: boolean) => `
  You are an expert Recruitment Strategist. Your task is to rank a list of candidates against a specific Job Description (JD).
  
  ${isBlind ? "BLIND SCREENING MODE ENABLED: Ignore candidate names, gender markers, and specific university names to prevent unconscious bias. Focus strictly on skills and experience." : ""}

  JOB DESCRIPTION:
  """
  ${jdText}
  """

  CANDIDATES TO RANK:
  ${candidates.map((c, i) => `
    CANDIDATE ${i + 1}:
    NAME: ${c.name}
    RESUME:
    ${c.resumeText}
  `).join("\n---\n")}

  INSTRUCTIONS:
  1. Perform a deep semantic analysis for each candidate against the JD.
  2. Weighted Hybrid Scoring (6-Axes): Calculate the final compatibility score (0-100) for each candidate using this EXACT formula:
     - 35% Semantic Similarity (0-35)
     - 25% Keyword Coverage (0-25)
     - 10% Industry Relevance (0-10)
     - 10% Role-Specific Relevance (0-10)
     - 10% Education Match (0-10)
     - 10% Communication Quality (0-10)
  3. Assign a compatibility score (0-100) to each candidate.
  4. Rank them from best to worst.
  5. Provide concise reasoning, 2-3 strengths, and 1-2 weaknesses for each.
  6. Include score breakdown, matched/missing keywords, and skill gap analysis.
  7. Extract JD requirements into structured fields.
  8. Provide resume optimizations, ATS check, bias detection, and confidence interval.
  9. Classify into Role Fit Archetypes: "Strong Match", "Upskillable", "Career Switcher", "Overqualified", "Weak Match".
  10. Provide salary benchmarking and generate 5 targeted interview questions based on the identified skill gaps and weaknesses for each candidate.
  11. Generate a one-paragraph LinkedIn-style recommendation snapshot for each candidate.

  Constraint: Be objective and rigorous. Set temperature to 0 for deterministic results.
  Output Format: Respond ONLY in valid JSON.
`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "leaderboard">("single");
  const [leaderboardCandidates, setLeaderboardCandidates] = useState<LeaderboardCandidate[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  const [leaderboardResults, setLeaderboardResults] = useState<RankedCandidate[]>([]);
  const [extractedJD, setExtractedJD] = useState<JDRequirements | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [copiedLeaderboardSnapshot, setCopiedLeaderboardSnapshot] = useState<number | null>(null);
  const [copiedQuestions, setCopiedQuestions] = useState(false);
  const [copiedLeaderboardQuestions, setCopiedLeaderboardQuestions] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leaderboardFileInputRef = useRef<HTMLInputElement>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Validate Connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Load history
  useEffect(() => {
    if (!isAuthReady) return;

    if (user) {
      // Load from Firestore
      const path = `users/${user.uid}/history`;
      const q = query(collection(db, path), orderBy("timestamp", "desc"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as HistoryItem[];
        setHistory(items);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
      
      return () => unsubscribe();
    } else {
      // Load from LocalStorage for guests
      const savedHistory = localStorage.getItem("precision_hire_history");
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
  }, [user, isAuthReady]);

  // Save guest history to LocalStorage
  useEffect(() => {
    if (!user && isAuthReady) {
      localStorage.setItem("precision_hire_history", JSON.stringify(history));
    }
  }, [history, user, isAuthReady]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign in failed", err);
      setError("Failed to sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setHistory([]);
      startNewAnalysis();
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  const structureResume = async (rawText: string): Promise<{ structuredText: string, linkedinUrl: string | null }> => {
    setIsStructuring(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";

      const prompt = `
        You are an expert Resume Parser. Your task is to take the following raw text extracted from a resume and structure it into a clean, professional format.

        RAW RESUME TEXT:
        """
        ${rawText}
        """

        STRUCTURE REQUIREMENTS:
        1. Identity: Name, contact info, LinkedIn URL, etc.
        2. Experience & Certifications: If the person has professional experience (not a fresher), list their work history and certifications here.
        3. Internships & Certifications: If the person is a fresher (little to no professional experience), list their internships and certifications here.
        4. Projects: List key projects if available.
        5. Education: List degrees, universities, and graduation dates.
        6. Skills: List technical and soft skills.

        FORMATTING RULES:
        - Use clear headings for each section.
        - Use bullet points for lists.
        - Keep the content factual and do not add information not present in the raw text.
        - If a section is completely missing, omit the heading.
        - Determine if the candidate is a "Fresher" or "Experienced" based on the text and use the appropriate section (2 or 3).

        Output the structured resume and the extracted LinkedIn URL in JSON format with the following keys:
        {
          "structuredText": "The full structured content",
          "linkedinUrl": "The full LinkedIn profile URL if found, otherwise null"
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              structuredText: { type: Type.STRING },
              linkedinUrl: { type: Type.STRING, nullable: true }
            },
            required: ["structuredText", "linkedinUrl"]
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const data = JSON.parse(response.text || "{}");
      return {
        structuredText: data.structuredText || rawText,
        linkedinUrl: data.linkedinUrl || null
      };
    } catch (err) {
      console.error("Structuring failed:", err);
      return { structuredText: rawText, linkedinUrl: null };
    } finally {
      setIsStructuring(false);
    }
  };

  const ocrImage = async (base64Data: string, mimeType: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { text: "Extract all text from this resume image. Maintain the layout as much as possible." },
            { inlineData: { data: base64Data, mimeType } }
          ]
        },
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });
      return response.text || "";
    } catch (err) {
      console.error("OCR failed:", err);
      return "";
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    let extractedText = "";
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        
        if (pageText.trim().length < 20) {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport }).promise;
          const base64Image = canvas.toDataURL("image/jpeg").split(",")[1];
          return await ocrImage(base64Image, "image/jpeg");
        } else {
          return pageText;
        }
      });

      const pages = await Promise.all(pagePromises);
      extractedText = pages.join("\n");
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      extractedText = await ocrImage(base64Data, file.type);
    } else {
      throw new Error("Unsupported file format. Please upload PDF, DOCX, or an Image.");
    }
    return extractedText;
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      const extractedText = await extractTextFromFile(file);
      const { structuredText, linkedinUrl } = await structureResume(extractedText);
      setResume(structuredText);
      setLinkedinUrl(linkedinUrl);
    } catch (err) {
      console.error("File parsing failed:", err);
      setError(err instanceof Error ? err.message : "Failed to parse the file.");
      setUploadedFileName(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      compatibility_score: { type: Type.INTEGER },
      confidence_interval: { type: Type.INTEGER },
      ats_score: { type: Type.INTEGER },
      ats_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
      bias_detected: { type: Type.BOOLEAN },
      bias_reasoning: { type: Type.STRING, nullable: true },
      score_breakdown: {
        type: Type.OBJECT,
        properties: {
          semantic_similarity: { type: Type.NUMBER },
          keyword_coverage: { type: Type.NUMBER },
          industry_relevance: { type: Type.NUMBER },
          role_relevance: { type: Type.NUMBER },
          education_match: { type: Type.NUMBER },
          communication_quality: { type: Type.NUMBER },
        },
        required: ["semantic_similarity", "keyword_coverage", "industry_relevance", "role_relevance", "education_match", "communication_quality"],
      },
      matched_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      missing_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      skill_gaps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skill: { type: Type.STRING },
            found: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          },
          required: ["skill", "found", "confidence", "notes"]
        }
      },
      summary_critique: { type: Type.STRING },
      actionable_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      optimized_bullet_point: { type: Type.STRING, nullable: true },
      jd_requirements: {
        type: Type.OBJECT,
        properties: {
          years_of_experience: { type: Type.STRING },
          required_tools: { type: Type.ARRAY, items: { type: Type.STRING } },
          certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          key_responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["years_of_experience", "required_tools", "certifications", "key_responsibilities"]
      },
      optimizations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original_text: { type: Type.STRING },
            optimized_text: { type: Type.STRING },
            reason: { type: Type.STRING },
            risk_level: { type: Type.STRING },
            risk_reason: { type: Type.STRING }
          },
          required: ["original_text", "optimized_text", "reason", "risk_level", "risk_reason"]
        }
      },
      role_fit_archetype: { type: Type.STRING },
      role_fit_reasoning: { type: Type.STRING },
      salary_benchmark: { type: Type.STRING },
      interview_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
      candidate_snapshot: { type: Type.STRING }
    },
    required: [
      "compatibility_score", 
      "confidence_interval",
      "ats_score",
      "ats_issues",
      "bias_detected",
      "score_breakdown", 
      "matched_keywords", 
      "missing_keywords", 
      "skill_gaps",
      "summary_critique", 
      "actionable_tips",
      "optimized_bullet_point",
      "jd_requirements",
      "optimizations",
      "role_fit_archetype",
      "role_fit_reasoning",
      "salary_benchmark",
      "interview_questions",
      "candidate_snapshot"
    ],
  };

  const getAnalysisPrompt = (resumeText: string, jdText: string, isBlind: boolean) => `
    You are an Advanced AI Recruitment Specialist and NLP Engine. Your task is to perform a deep semantic analysis between the provided Candidate Resume and Job Description (JD).

    ${isBlind ? "BLIND SCREENING MODE ENABLED: Ignore candidate name, gender markers, and specific university names to prevent unconscious bias. Focus strictly on skills and experience." : ""}

    CANDIDATE RESUME:
    """
    ${resumeText}
    """

    JOB DESCRIPTION:
    """
    ${jdText}
    """

    Follow these scoring and analysis protocols:
    1. Weighted Hybrid Scoring (6-Axes): Calculate the final compatibility_score (0-100) using this EXACT formula:
       - 35% Semantic Similarity: Conceptual alignment of skills and background.
       - 25% Keyword Coverage: Exact and synonymous matches for tools and tech.
       - 10% Industry Relevance: Experience within the specific industry of the JD.
       - 10% Role-Specific Relevance: Experience in the exact role/function described.
       - 10% Education/Certification Match: Relevance of degrees and certs.
       - 10% Communication Quality: How well-written, structured, and quantified the resume is.
    2. Hard Skills Match: Identify technical skills, tools, and certifications. Use semantic mapping.
    3. Experience Alignment: Evaluate years of experience and seniority level.
    4. Soft Skills & Cultural Fit: Extract behavioral traits and leadership evidence.
    5. Gap Analysis: Identify critical missing keywords or experiences.
    6. Improvement Suggestions: Provide actionable advice.
    7. Optimization Engine: Identify 2-3 specific phrases from the resume and rewrite them to better incorporate JD keywords while strictly maintaining factual intent. Assign "Authenticity Risk" (Safe, Review, Caution) and "risk_reason".
    8. JD Requirement Extraction: Extract key details from the Job Description into structured fields.
    9. ATS Readability Check: Evaluate the resume for structural issues. Score 0-100 and list specific issues found.
    10. Bias Detection: Flag if the JD or the filtering process seems to penalize employment gaps, non-linear career paths, or non-western university names.
    11. Confidence Interval: Provide a +/- percentage representing your statistical confidence in the match score.
    12. Skill Gap Table: Create a side-by-side comparison of required skills vs found status with confidence levels.
    13. Role Fit Archetype: Classify the candidate into one of these 5 archetypes: "Strong Match", "Upskillable", "Career Switcher", "Overqualified", "Weak Match". Provide "role_fit_reasoning".
    14. Salary Benchmarking: Provide a realistic salary range benchmark based on the role, location, and match level.
    15. Interview Question Generator: Based on the identified skill gaps and weaknesses, auto-generate 5 targeted interview questions that probe the candidate's weak areas. For example, if a required skill like "cloud architecture" is missing, generate a question like: "Can you describe any experience you've had designing or working within cloud-based infrastructures?" or ask how they would handle tasks requiring that skill.
    16. Candidate Persona Card: Generate a one-paragraph LinkedIn-style recommendation snapshot.

    Constraint: Be objective and rigorous. Set temperature to 0 for deterministic results.
    Output Format: Respond ONLY in valid JSON.
  `;

  const analyzeResume = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Please provide both a resume and a job description.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setLoadingMessage("Extracting JD requirements...");

    try {
      setLoadingMessage("Running semantic comparison...");
      const data = await callGemini(getAnalysisPrompt(resume, jobDescription, isBlindMode), ANALYSIS_SCHEMA) as AnalysisResult;
      
      setLoadingMessage("Generating optimization tips...");
      
      // Save to history
      const historyData: Omit<HistoryItem, 'id'> = {
        timestamp: Date.now(),
        resume,
        jobDescription,
        result: data,
        userId: user?.uid || "guest",
        linkedinUrl,
        type: 'single'
      };

      if (user) {
        const path = `users/${user.uid}/history`;
        try {
          await addDoc(collection(db, path), historyData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          ...historyData
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      }
      
      setResult(data);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    if (item.type === 'single') {
      setActiveTab("single");
      setResume(item.resume || "");
      setJobDescription(item.jobDescription);
      setResult(item.result || null);
      setLinkedinUrl(item.linkedinUrl || null);
    } else {
      setActiveTab("leaderboard");
      setJobDescription(item.jobDescription);
      setLeaderboardResults(item.leaderboardResults || []);
      setExtractedJD(item.extractedJD || null);
      // We don't necessarily have the original resumes in history for leaderboard yet
      // but we show the results
    }
    setUploadedFileName(null);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHistoryItem = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (user) {
      const path = `users/${user.uid}/history/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const rankCandidates = async () => {
    if (!jobDescription || leaderboardCandidates.length === 0) {
      setError("Please provide a Job Description and at least one resume.");
      return;
    }

    setIsRanking(true);
    setError(null);
    setLeaderboardResults([]);
    setExtractedJD(null);
    setLoadingMessage("Extracting JD requirements...");

    try {
      setLoadingMessage("Ranking candidates...");
      const results = await callGemini(getRankingPrompt(leaderboardCandidates, jobDescription, isBlindMode), RANKING_SCHEMA);

      setLoadingMessage("Finalizing results...");

      const rankedCandidates = results.candidates || [];
      const jdRequirements = results.jd_requirements || null;
      
      setLeaderboardResults(rankedCandidates);
      setExtractedJD(jdRequirements);

      // Save to history
      const historyData: Omit<HistoryItem, 'id'> = {
        timestamp: Date.now(),
        jobDescription,
        leaderboardResults: rankedCandidates,
        extractedJD: jdRequirements,
        userId: user?.uid || "guest",
        type: 'leaderboard'
      };

      if (user) {
        const path = `users/${user.uid}/history`;
        try {
          await addDoc(collection(db, path), historyData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          ...historyData
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      }
    } catch (err) {
      console.error("Ranking failed:", err);
      setError("Failed to rank candidates. Please try again.");
    } finally {
      setIsRanking(false);
    }
  };

  const handleLeaderboardFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = MODEL_NAME;
      
      const fileArray: File[] = Array.from(files);
      const candidatesPromises = fileArray.map(async (file: File) => {
        try {
          const extractedText = await extractTextFromFile(file);
          
          // Extract name from resume using AI
          const nameResponse = await ai.models.generateContent({
            model,
            contents: `Extract the full name of the candidate from this resume text. If not found, use the filename: ${file.name}. Output ONLY the name.\n\n${extractedText}`,
            config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          });
          const name = nameResponse.text?.trim() || file.name;

          return {
            id: Math.random().toString(36).substr(2, 9),
            name,
            resumeText: extractedText,
            fileName: file.name
          };
        } catch (err) {
          console.warn(`Skipping file ${file.name}:`, err);
          return null;
        }
      });

      const results = await Promise.all(candidatesPromises);
      const newCandidates = results.filter((c): c is LeaderboardCandidate => c !== null);

      setLeaderboardCandidates(prev => [...prev, ...newCandidates]);
    } catch (err) {
      console.error("Bulk upload failed:", err);
      setError("Failed to process some files. Please try again.");
    } finally {
      setIsUploading(false);
      if (leaderboardFileInputRef.current) {
        leaderboardFileInputRef.current.value = "";
      }
    }
  };

  const removeCandidate = (id: string) => {
    setLeaderboardCandidates(prev => prev.filter(c => c.id !== id));
  };

  const startNewAnalysis = () => {
    setResume("");
    setJobDescription("");
    setResult(null);
    setError(null);
    setUploadedFileName(null);
    setLinkedinUrl(null);
    setLeaderboardCandidates([]);
    setLeaderboardResults([]);
    setExtractedJD(null);
  };

  const applyOptimization = (original: string, optimized: string) => {
    setResume(prev => prev.replace(original, optimized));
    if (result) {
      setResult({
        ...result,
        optimizations: result.optimizations.filter(opt => opt.original_text !== original)
      });
    }
  };

  const applyLeaderboardOptimization = (candidateName: string, original: string, optimized: string) => {
    setLeaderboardCandidates(prev => prev.map(c => {
      if (c.name === candidateName) {
        return { ...c, resumeText: c.resumeText.replace(original, optimized) };
      }
      return c;
    }));
    setLeaderboardResults(prev => prev.map(r => {
      if (r.name === candidateName) {
        return {
          ...r,
          optimizations: r.optimizations.filter(opt => opt.original_text !== original)
        };
      }
      return r;
    }));
  };

  const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      setLoadingMessage("Generating PDF report...");
      setIsAnalyzing(true);
      
      // Wait for animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc",
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const cleanText = (text: string) => {
            if (!text) return text;
            // Replace modern CSS functions that html2canvas doesn't support
            const funcRegex = (name: string) => new RegExp(`${name}\\((?:[^()]+|\\((?:[^()]+|\\((?:[^()]+|\\([^()]*\\))*\\))*\\))*\\)`, 'g');
            return text
              .replace(/oklch\([^)]+\)/g, '#6366f1')
              .replace(/color-mix\([^)]+\)/g, '#6366f1')
              .replace(/light-dark\([^)]+\)/g, '#6366f1')
              .replace(/backdrop-filter:[^;]+;/g, 'backdrop-filter: none;');
          };
          
          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          styleTags.forEach(style => {
            try {
              style.innerHTML = cleanText(style.innerHTML);
            } catch (e) {
              console.warn("Style tag sanitization failed", e);
            }
          });

          // Clean inline styles efficiently across all elements
          const allElements = Array.from(clonedDoc.getElementsByTagName('*'));
          allElements.forEach(el => {
            if (el instanceof HTMLElement || el instanceof SVGElement) {
              const style = el.getAttribute('style');
              if (style && (style.includes('oklch') || style.includes('color-mix') || style.includes('light-dark'))) {
                el.setAttribute('style', cleanText(style));
              }
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "l" : "p",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BrainCircuit className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Precision<span className="text-indigo-600">Hire</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab("single")}
                className={`px-2 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all ${activeTab === "single" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <span className="hidden xs:inline">Single Analysis</span>
                <span className="xs:hidden">Single</span>
              </button>
              <button 
                onClick={() => setActiveTab("leaderboard")}
                className={`px-2 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all ${activeTab === "leaderboard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <span className="hidden xs:inline">Leaderboard</span>
                <span className="xs:hidden">Rank</span>
              </button>
            </div>
            
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all relative"
              title="History"
            >
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
              {history.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
              )}
            </button>
            
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-500 mr-4">
              <button 
                onClick={() => setShowHowItWorks(true)}
                className="hover:text-indigo-600 transition-colors"
              >
                How it works
              </button>
              <button 
                onClick={() => setShowEnterprise(true)}
                className="hover:text-indigo-600 transition-colors"
              >
                Enterprise
              </button>
            </div>
            
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden xl:block text-right">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</p>
                </div>
                <div className="relative group">
                  <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-100 overflow-hidden hover:border-indigo-600 transition-all">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 sm:w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100]">
                    <button 
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-[10px] sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2"
              >
                <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* History Sidebar Overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="text-indigo-600 w-5 h-5" />
                  <h3 className="font-bold text-lg">Analysis History</h3>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No history yet</p>
                    <p className="text-xs text-slate-300 mt-1">Your past analyses will appear here</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      onClick={() => loadFromHistory(item)}
                      className="group p-4 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-2xl transition-all cursor-pointer relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            item.type === 'single' ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => deleteHistoryItem(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate mb-1">
                            {item.jobDescription.split('\n')[0] || "Untitled JD"}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {item.type === 'single' 
                              ? (item.resume?.split('\n')[0] || "Untitled Resume")
                              : `${item.leaderboardResults?.length || 0} Candidates Ranked`}
                          </p>
                          {item.type === 'single' && item.result && (
                            <div className="mt-2">
                              <RoleFitBadge archetype={item.result.role_fit_archetype} reasoning={item.result.role_fit_reasoning} className="scale-75 origin-left" />
                            </div>
                          )}
                          {item.type === 'leaderboard' && item.leaderboardResults && item.leaderboardResults.length > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-400">Top:</span>
                              <span className="text-[10px] font-black text-indigo-600">{item.leaderboardResults[0].name}</span>
                              <span className="text-[10px] font-bold text-slate-400">({item.leaderboardResults[0].score}%)</span>
                            </div>
                          )}
                        </div>
                        {item.type === 'single' && item.result && (
                          <div className={`
                            px-3 py-1 rounded-full text-xs font-black
                            ${item.result.compatibility_score >= 80 ? "bg-emerald-100 text-emerald-700" : 
                              item.result.compatibility_score >= 60 ? "bg-amber-100 text-amber-700" : 
                              "bg-indigo-100 text-indigo-700"}
                          `}>
                            {item.result.compatibility_score}%
                          </div>
                        )}
                        {item.type === 'leaderboard' && item.leaderboardResults && item.leaderboardResults.length > 0 && (
                          <div className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700">
                            Avg: {Math.round(item.leaderboardResults.reduce((acc, curr) => acc + curr.score, 0) / item.leaderboardResults.length)}%
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={() => {
                    startNewAnalysis();
                    setShowHistory(false);
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Analysis
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight px-4"
          >
            {activeTab === "single" ? (
              <>Deep Semantic <span className="text-indigo-600">Resume Analysis</span></>
            ) : (
              <>Candidate <span className="text-indigo-600">Leaderboard</span></>
            )}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-6"
          >
            {activeTab === "single" 
              ? "Our NLP engine goes beyond keyword matching to understand the true compatibility between candidates and roles."
              : "Upload multiple resumes to rank candidates based on their semantic fit for the job description."}
          </motion.p>
        </div>

        {activeTab === "single" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Resume Input */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600 w-5 h-5" />
                <h3 className="font-semibold text-slate-800">Candidate Resume</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsBlindMode(!isBlindMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isBlindMode 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                      : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200"
                  }`}
                  title="Anonymize candidate name, gender, and university to reduce bias"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isBlindMode ? "text-white" : "text-slate-400"}`} />
                  Blind Mode {isBlindMode ? "ON" : "OFF"}
                </button>
                {(resume || result) && (
                  <button 
                    onClick={startNewAnalysis}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Clear
                  </button>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isStructuring}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
                >
                  {(isUploading || isStructuring) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {isUploading ? "Parsing..." : isStructuring ? "Structuring..." : "Upload File"}
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,image/*"
                  className="hidden"
                />
              </div>
            </div>
            
            <div className="relative">
              {linkedinUrl && (
                <div className="mb-3">
                  <a 
                    href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    View LinkedIn Profile
                  </a>
                </div>
              )}
              <textarea
                value={resume}
                onChange={(e) => {
                  setResume(e.target.value);
                  if (uploadedFileName) setUploadedFileName(null);
                }}
                placeholder="Paste or upload a file (PDF, DOCX)..."
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
              />
              {uploadedFileName && (
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm border border-indigo-100 p-2 rounded-lg flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600 truncate">
                    <FileUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="truncate">{uploadedFileName}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setResume("");
                      setUploadedFileName(null);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* JD Input */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="text-indigo-600 w-5 h-5" />
                <h3 className="font-semibold text-slate-800">Job Description</h3>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Samples:</p>
                <div className="flex gap-2">
                  {SAMPLE_JDS.map((sample, i) => (
                    <button
                      key={i}
                      onClick={() => setJobDescription(sample.content)}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded text-[10px] font-bold transition-all border border-transparent hover:border-indigo-100"
                      title={sample.title}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
            />
          </motion.div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-4 mb-16 px-4">
          <button
            onClick={analyzeResume}
            disabled={isAnalyzing || isUploading}
            className={`
              relative overflow-hidden group w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <div className="flex flex-col items-start">
                  <span>Analyzing...</span>
                  <span className="text-[10px] font-medium text-indigo-200 animate-pulse">{loadingMessage}</span>
                </div>
              </>
            ) : (
              <>
                Run Precision Analysis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          {error && (
            <p className="text-red-500 text-sm font-medium flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
          
          <div className="max-w-xl bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 mt-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Disclaimer:</span> This score is AI-generated and intended as a decision-support tool, not a replacement for human judgment. PrecisionHire AI aims to reduce bias, but all recruitment decisions should be verified by a qualified professional.
            </p>
          </div>
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              id="analysis-report"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="text-indigo-600 w-6 h-6" />
                  <h3 className="text-2xl font-bold text-slate-900">Analysis Report</h3>
                </div>
                <button
                  data-html2canvas-ignore
                  onClick={() => exportToPDF("analysis-report", `PrecisionHire_Report_${Date.now()}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
              {/* JD Requirements Analysis */}
              <JDRequirementsCard requirements={result.jd_requirements} />

              {/* Score Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  {result.bias_detected && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Potential Bias Detected
                    </div>
                  )}
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Compatibility Score</h4>
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="12"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={result.compatibility_score >= 80 ? "#10b981" : result.compatibility_score >= 60 ? "#f59e0b" : "#6366f1"}
                        strokeWidth="12"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * result.compatibility_score) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl sm:text-5xl font-black text-slate-900">{result.compatibility_score}%</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">± {result.confidence_interval}%</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <RoleFitBadge archetype={result.role_fit_archetype} reasoning={result.role_fit_reasoning} />
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-emerald-50 rounded-lg">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Context</h5>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {result.salary_benchmark}
                    </p>
                  </div>
                  {result.bias_detected && (
                    <p className="mt-4 text-[10px] text-red-600 font-medium leading-tight">
                      {result.bias_reasoning}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Score Breakdown</h4>
                      <p className="text-[10px] text-slate-400 mt-1 italic">6-Axes Hybrid: 35% Sem, 25% Key, 10% Ind, 10% Role, 10% Edu, 10% Comm</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">ATS Readability: {result.ats_score}%</span>
                      </div>
                      {result.ats_issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                          {result.ats_issues.map((issue, i) => (
                            <span key={i} className="text-[8px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <ScoreBar label="Semantic Similarity (35%)" value={result.score_breakdown.semantic_similarity} max={35} icon={<BrainCircuit className="w-4 h-4" />} />
                      <ScoreBar label="Keyword Coverage (25%)" value={result.score_breakdown.keyword_coverage} max={25} icon={<Zap className="w-4 h-4" />} />
                      <ScoreBar label="Industry Relevance (10%)" value={result.score_breakdown.industry_relevance} max={10} icon={<Globe className="w-4 h-4" />} />
                      <ScoreBar label="Role-Specific Match (10%)" value={result.score_breakdown.role_relevance} max={10} icon={<Target className="w-4 h-4" />} />
                      <ScoreBar label="Education & Certs (10%)" value={result.score_breakdown.education_match} max={10} icon={<Award className="w-4 h-4" />} />
                      <ScoreBar label="Comm. Quality (10%)" value={result.score_breakdown.communication_quality} max={10} icon={<MessageSquare className="w-4 h-4" />} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Gap Analysis Table */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TableProperties className="text-indigo-600 w-5 h-5" />
                    Skill Match Overview
                  </h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Instant Decision Matrix</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Required Skill</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Found in Resume</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Confidence</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {result.skill_gaps.map((gap, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-slate-700">{gap.skill}</td>
                          <td className="py-4 text-center">
                            {gap.found ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200 shadow-sm" title="Found">
                                <CheckCircle2 className="w-5 h-5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full border border-red-200 shadow-sm" title="Missing">
                                <XCircle className="w-5 h-5" />
                              </span>
                            )}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                                <div 
                                  className={`h-full rounded-full ${gap.confidence > 0.8 ? "bg-emerald-500" : gap.confidence > 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                                  style={{ width: `${gap.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-500">{Math.round(gap.confidence * 100)}%</span>
                            </div>
                          </td>
                          <td className="py-4 text-xs text-slate-500 italic max-w-xs">{gap.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Visual Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <LayoutDashboard className="text-indigo-600 w-5 h-5" />
                    Skill Profile
                  </h4>
                  <RadarChartComponent breakdown={result.score_breakdown} />
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Globe className="text-indigo-600 w-5 h-5" />
                    Keyword Cloud
                  </h4>
                  <KeywordCloudComponent matched={result.matched_keywords} missing={result.missing_keywords} />
                </div>
              </div>

              {/* Summary & Keywords */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <BrainCircuit className="text-indigo-600 w-5 h-5" />
                      Recruiter Summary
                    </h4>
                    <p className="text-slate-600 leading-relaxed italic">
                      "{result.summary_critique}"
                    </p>
                  </div>

                  <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => copyToClipboard(result.candidate_snapshot, setCopiedSnapshot)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-[10px] font-black uppercase tracking-widest"
                      >
                        {copiedSnapshot ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedSnapshot ? "Copied!" : "Copy Snapshot"}
                      </button>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <UserCircle className="text-indigo-600 w-5 h-5" />
                      Candidate Persona Card
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-6 uppercase tracking-widest font-black">LinkedIn-style recommendation for Hiring Committees</p>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-indigo-500 italic text-slate-700 leading-relaxed relative">
                      <span className="absolute -top-2 -left-1 text-4xl text-indigo-200 font-serif">"</span>
                      {result.candidate_snapshot}
                      <span className="absolute -bottom-6 -right-1 text-4xl text-indigo-200 font-serif">"</span>
                    </div>
                    <div className="mt-8 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">AI Recruitment Specialist</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Generated for Hiring Committee</p>
                      </div>
                    </div>
                  </div>

                  {result.interview_questions && result.interview_questions.length > 0 && (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative group">
                      <div className="absolute top-0 right-0 p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => copyToClipboard(result.interview_questions.join("\n\n"), setCopiedQuestions)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                          {copiedQuestions ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedQuestions ? "Copied!" : "Copy Questions"}
                        </button>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <MessageSquare className="text-indigo-600 w-5 h-5" />
                        Targeted Interview Questions
                      </h4>
                      <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-black">Probing identified skill gaps & weaknesses</p>
                      <div className="space-y-4">
                        {result.interview_questions.map((q, i) => (
                          <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-black text-indigo-600 border border-slate-200 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {i + 1}
                            </div>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                      <h4 className="text-emerald-900 font-bold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Matched Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.matched_keywords.map((kw, i) => (
                          <span key={i} className="px-3 py-1 bg-white text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 shadow-sm">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                      <h4 className="text-amber-900 font-bold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.missing_keywords.map((kw, i) => (
                          <span key={i} className="px-3 py-1 bg-white text-amber-700 rounded-full text-xs font-semibold border border-amber-200 shadow-sm">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100">
                    <h4 className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Actionable Tips
                    </h4>
                    <ul className="space-y-4">
                      {result.actionable_tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 text-sm text-indigo-800 leading-relaxed">
                          <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.optimized_bullet_point && (
                    <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl">
                      <h4 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Optimization Engine
                      </h4>
                      <p className="text-xs text-slate-400 mb-4 uppercase tracking-widest font-bold">Recommended Bullet Rewrite</p>
                      <p className="text-sm leading-relaxed text-slate-200 bg-slate-800 p-4 rounded-xl border border-slate-700">
                        {result.optimized_bullet_point}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Resume Optimizations */}
              {result.optimizations.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Zap className="text-indigo-600 w-6 h-6" />
                    <h3 className="text-2xl font-bold text-slate-900">Precision Optimizations</h3>
                  </div>
                  <p className="text-slate-600 max-w-2xl">
                    Our NLP engine has identified specific phrases in your resume that can be optimized for better keyword density and JD relevance. Apply these changes to instantly improve your match score.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {result.optimizations.map((opt, i) => (
                      <OptimizationCard 
                        key={i} 
                        optimization={opt} 
                        onApply={() => applyOptimization(opt.original_text, opt.optimized_text)} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </>
        ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* JD Input for Leaderboard */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="text-indigo-600 w-5 h-5" />
                <h3 className="font-semibold text-slate-800">Job Description</h3>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description..."
                className="w-full flex-grow p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed min-h-[300px]"
              />
            </motion.div>

            {/* Candidate List */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="text-indigo-600 w-5 h-5" />
                  <h3 className="font-semibold text-slate-800">Candidates ({leaderboardCandidates.length})</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsBlindMode(!isBlindMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isBlindMode 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                        : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200"
                    }`}
                    title="Anonymize candidate names, gender, and university to reduce bias"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isBlindMode ? "text-white" : "text-slate-400"}`} />
                    Blind Mode {isBlindMode ? "ON" : "OFF"}
                  </button>
                  {leaderboardCandidates.length > 0 && (
                    <button 
                      onClick={() => setLeaderboardCandidates([])}
                      className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => leaderboardFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isUploading ? "Uploading..." : "Add Resumes"}
                  </button>
                  <input 
                    type="file"
                    ref={leaderboardFileInputRef}
                    onChange={handleLeaderboardFileUpload}
                    accept=".pdf,.docx,image/*"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {leaderboardCandidates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                    <FileUp className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No candidates added yet.<br/>Upload multiple resumes to start ranking.</p>
                  </div>
                ) : (
                  leaderboardCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{candidate.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{candidate.fileName}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeCandidate(candidate.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6">
                <button 
                  onClick={rankCandidates}
                  disabled={isRanking || isUploading || leaderboardCandidates.length === 0 || !jobDescription}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isRanking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <div className="flex flex-col items-start">
                        <span>Ranking Candidates...</span>
                        <span className="text-[10px] font-medium text-indigo-200 animate-pulse">{loadingMessage}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" />
                      Rank Candidates
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-red-500 text-center text-sm font-medium mt-4 flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Leaderboard Results */}
          <AnimatePresence>
            {leaderboardResults.length > 0 && (
              <motion.div
                id="leaderboard-report"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="text-indigo-600 w-6 h-6" />
                    <h3 className="text-2xl font-bold text-slate-900">Ranked Results</h3>
                  </div>
                  <button
                    data-html2canvas-ignore
                    onClick={() => exportToPDF("leaderboard-report", `PrecisionHire_Leaderboard_${Date.now()}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
                
                {extractedJD && <JDRequirementsCard requirements={extractedJD} />}

                <div className="grid grid-cols-1 gap-4">
                  {leaderboardResults.map((candidate) => (
                    <motion.div 
                      key={candidate.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: candidate.rank * 0.1 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative overflow-hidden"
                    >
                      {candidate.rank <= 3 && (
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${
                          candidate.rank === 1 ? "bg-amber-400" : 
                          candidate.rank === 2 ? "bg-slate-300" : 
                          "bg-amber-600"
                        }`} />
                      )}
                      
                      <div className="flex flex-col items-center justify-center min-w-[100px] md:border-r md:border-slate-100 md:pr-6">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl mb-2 ${
                          candidate.rank === 1 ? "bg-amber-100 text-amber-600 border-2 border-amber-200" : 
                          candidate.rank === 2 ? "bg-slate-100 text-slate-600 border-2 border-slate-200" : 
                          candidate.rank === 3 ? "bg-amber-50 text-amber-800 border-2 border-amber-100" :
                          "bg-slate-50 text-slate-400"
                        }`}>
                          {candidate.rank}
                        </div>
                        <div className="text-center">
                          <p className="text-xl sm:text-2xl font-black text-slate-900">{candidate.score}%</p>
                          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Match</p>
                          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 mt-1 mb-2">± {candidate.confidence_interval}%</p>
                          <RoleFitBadge archetype={candidate.role_fit_archetype} reasoning={candidate.role_fit_reasoning} className="scale-75 sm:scale-90" />
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 w-full hidden md:block">
                           <div className="flex items-center gap-1.5 mb-1">
                             <Coins className="w-3 h-3 text-emerald-600" />
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Market Range</span>
                           </div>
                           <p className="text-[10px] text-slate-600 font-bold leading-tight">
                             {candidate.salary_benchmark}
                           </p>
                        </div>
                        {candidate.bias_detected && (
                          <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-red-600 font-medium leading-tight">
                              {candidate.bias_reasoning || "Potential bias detected in JD or resume structure."}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xl font-bold text-slate-900">{candidate.name}</h4>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">
                              <FileCheck className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest">ATS: {candidate.ats_score}%</span>
                            </div>
                            {candidate.ats_issues.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                {candidate.ats_issues.map((issue, i) => (
                                  <span key={i} className="text-[7px] font-bold bg-red-50 text-red-600 px-1 py-0.5 rounded border border-red-100">
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 italic">
                          "{candidate.reasoning}"
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Key Strengths
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.strengths.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-100">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Gaps / Weaknesses
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.weaknesses.map((w, i) => (
                                <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold border border-amber-100">
                                  {w}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => setExpandedCandidate(expandedCandidate === candidate.rank ? null : candidate.rank)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            {expandedCandidate === candidate.rank ? "Hide Visual Insights" : "Show Visual Insights"}
                          </button>

                          <AnimatePresence>
                            {expandedCandidate === candidate.rank && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Skill Profile</p>
                                    <p className="text-[8px] text-slate-400 mb-4 text-center italic">6-Axes: 35% Sem, 25% Key, 10% Ind, 10% Role, 10% Edu, 10% Comm</p>
                                    <RadarChartComponent breakdown={candidate.score_breakdown} />
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Keyword Cloud</p>
                                    <KeywordCloudComponent matched={candidate.matched_keywords} missing={candidate.missing_keywords} />
                                  </div>
                                </div>

                                <div className="mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Skill Match Overview</p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-slate-200">
                                          <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Skill</th>
                                          <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Found in Resume</th>
                                          <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {candidate.skill_gaps.map((gap, i) => (
                                          <tr key={i}>
                                            <td className="py-2 text-xs font-bold text-slate-700">{gap.skill}</td>
                                            <td className="py-2 text-center">
                                              {gap.found ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                              ) : (
                                                <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                                              )}
                                            </td>
                                            <td className="py-2">
                                              <span className="text-[10px] font-bold text-slate-400">{Math.round(gap.confidence * 100)}%</span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {candidate.candidate_snapshot && (
                                  <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => copyToClipboard(candidate.candidate_snapshot, (v) => setCopiedLeaderboardSnapshot(v ? candidate.rank : null))}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-[8px] font-black uppercase tracking-widest"
                                      >
                                        {copiedLeaderboardSnapshot === candidate.rank ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedLeaderboardSnapshot === candidate.rank ? "Copied!" : "Copy Snapshot"}
                                      </button>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center flex items-center justify-center gap-2">
                                      <UserCircle className="w-3 h-3 text-indigo-600" />
                                      Candidate Persona Card
                                    </p>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-700 leading-relaxed relative">
                                      "{candidate.candidate_snapshot}"
                                    </div>
                                  </div>
                                )}

                                {candidate.interview_questions && candidate.interview_questions.length > 0 && (
                                  <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => copyToClipboard(candidate.interview_questions.join("\n\n"), (v) => setCopiedLeaderboardQuestions(v ? candidate.rank : null))}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-[8px] font-black uppercase tracking-widest"
                                      >
                                        {copiedLeaderboardQuestions === candidate.rank ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedLeaderboardQuestions === candidate.rank ? "Copied!" : "Copy Questions"}
                                      </button>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Targeted Interview Questions</p>
                                    <div className="space-y-3">
                                      {candidate.interview_questions.map((q, i) => (
                                        <div key={i} className="flex gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                                            {i + 1}
                                          </div>
                                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{q}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {candidate.optimizations.length > 0 && (
                                  <div className="mt-8 space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                      <Zap className="w-3 h-3 text-indigo-600" />
                                      Suggested Optimizations
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {candidate.optimizations.map((opt, i) => (
                                        <OptimizationCard 
                                          key={i} 
                                          optimization={opt} 
                                          onApply={() => applyLeaderboardOptimization(candidate.name, opt.original_text, opt.optimized_text)} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12 text-center">
        <p className="text-slate-400 text-sm">
          &copy; 2026 PrecisionHire NLP Engine. All rights reserved.
        </p>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showHowItWorks && (
          <Modal onClose={() => setShowHowItWorks(false)} title="How PrecisionHire Works">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <Cpu className="text-indigo-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Neural Semantic Mapping</h4>
                  <p className="text-sm text-slate-600 mt-1">Our engine doesn't just look for words. It understands context. If a JD asks for "Deep Learning" and your resume mentions "PyTorch" or "TensorFlow", we recognize the high-level expertise match.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <BarChart3 className="text-emerald-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Multi-Vector Scoring</h4>
                  <p className="text-sm text-slate-600 mt-1">We evaluate four key dimensions: Technical Proficiency, Experience Seniority, Educational Alignment, and Soft Skill/Cultural Fit indicators.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="text-amber-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Optimization Engine</h4>
                  <p className="text-sm text-slate-600 mt-1">If your score is below 80%, our AI identifies the most impactful bullet point in your resume and rewrites it to better align with the JD's specific terminology without changing your factual history.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Scan className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Intelligent OCR</h4>
                  <p className="text-sm text-slate-600 mt-1">For non-editable documents like scanned images or image-based PDFs, our OCR technology converts pixels into digital, machine-readable text using Gemini's multimodal vision capabilities.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {showEnterprise && (
          <Modal onClose={() => setShowEnterprise(false)} title="PrecisionHire for Enterprise">
            <div className="space-y-6">
              <div className="p-6 bg-slate-900 rounded-2xl text-white">
                <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Scale Your Recruitment
                </h4>
                <p className="text-sm text-slate-300">Unlock advanced features designed for high-volume hiring teams and recruitment agencies.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 rounded-xl">
                  <Globe className="text-indigo-600 w-5 h-5 mb-2" />
                  <h5 className="font-bold text-sm">Bulk Analysis</h5>
                  <p className="text-xs text-slate-500 mt-1">Analyze hundreds of resumes against a single JD in seconds.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl">
                  <BrainCircuit className="text-indigo-600 w-5 h-5 mb-2" />
                  <h5 className="font-bold text-sm">Custom NLP Models</h5>
                  <p className="text-xs text-slate-500 mt-1">Train the engine on your company's specific culture and jargon.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl">
                  <Mail className="text-indigo-600 w-5 h-5 mb-2" />
                  <h5 className="font-bold text-sm">ATS Integration</h5>
                  <p className="text-xs text-slate-500 mt-1">Connect directly with Greenhouse, Lever, or Workday.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl">
                  <MessageSquare className="text-indigo-600 w-5 h-5 mb-2" />
                  <h5 className="font-bold text-sm">24/7 Support</h5>
                  <p className="text-xs text-slate-500 mt-1">Dedicated account manager and technical support.</p>
                </div>
              </div>
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Contact Sales</p>
                <div className="space-y-2">
                  <a 
                    href="mailto:vvadlamudimouryan@gmail.com" 
                    className="flex items-center justify-center gap-2 text-slate-900 font-bold hover:text-indigo-600 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    vvadlamudimouryan@gmail.com
                  </a>
                  <a 
                    href="tel:+919182925183" 
                    className="flex items-center justify-center gap-2 text-slate-900 font-bold hover:text-indigo-600 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    +91 9182925183
                  </a>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptimizationCard({ optimization, onApply }: { optimization: ResumeOptimization, onApply: () => void, key?: any }) {
  const riskConfig = {
    Safe: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Safe — adds context without changing meaning' },
    Review: { icon: <AlertTriangle className="w-3 h-3" />, color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Review — rephrases significantly, verify accuracy' },
    Caution: { icon: <AlertCircle className="w-3 h-3" />, color: 'bg-red-50 text-red-700 border-red-200', label: 'Caution — adds a skill not clearly evidenced in original' }
  };

  const config = riskConfig[optimization.risk_level] || riskConfig.Safe;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${config.color} border-l border-b`}>
        {config.icon}
        <span>Authenticity Risk: {optimization.risk_level}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-4 mt-2">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Zap className="w-5 h-5 text-indigo-600" />
        </div>
        <button
          onClick={onApply}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shrink-0"
        >
          Apply Change
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Text</p>
          <p className="text-sm text-slate-500 line-through italic bg-slate-50 p-3 rounded-xl border border-slate-100">
            {optimization.original_text}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Optimized Suggestion</p>
          <p className="text-sm text-slate-900 font-medium bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            {optimization.optimized_text}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reasoning</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {optimization.reason}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risk Assessment</p>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              {optimization.risk_reason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function JDRequirementsCard({ requirements }: { requirements: JDRequirements }) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
      <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Briefcase className="text-indigo-600 w-5 h-5" />
        JD Requirements Analysis
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Experience</p>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              {requirements.years_of_experience}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Key Responsibilities</p>
            <ul className="space-y-2">
              {requirements.key_responsibilities.map((item, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Required Tools & Tech</p>
            <div className="flex flex-wrap gap-2">
              {requirements.required_tools.map((tool, i) => (
                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200">
                  {tool}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Certifications Mentioned</p>
            <div className="flex flex-wrap gap-2">
              {requirements.certifications.length > 0 ? (
                requirements.certifications.map((cert, i) => (
                  <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">
                    {cert}
                  </span>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">None specified</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarChartComponent({ breakdown }: { breakdown: AnalysisResult['score_breakdown'] }) {
  const data = [
    { subject: 'Semantic', A: breakdown.semantic_similarity, fullMark: 35 },
    { subject: 'Keywords', A: breakdown.keyword_coverage, fullMark: 25 },
    { subject: 'Industry', A: breakdown.industry_relevance, fullMark: 10 },
    { subject: 'Role', A: breakdown.role_relevance, fullMark: 10 },
    { subject: 'Education', A: breakdown.education_match, fullMark: 10 },
    { subject: 'Comm.', A: breakdown.communication_quality, fullMark: 10 },
  ];

  return (
    <div className="w-full h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 35]} tick={false} axisLine={false} />
          <Radar
            name="Candidate"
            dataKey="A"
            stroke="#4f46e5"
            fill="#4f46e5"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function KeywordCloudComponent({ matched, missing }: { matched: string[], missing: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {matched.map((kw, i) => (
        <motion.span
          key={`matched-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200 shadow-sm hover:scale-110 transition-transform cursor-default"
        >
          {kw}
        </motion.span>
      ))}
      {missing.map((kw, i) => (
        <motion.span
          key={`missing-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (matched.length + i) * 0.05 }}
          className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold border border-rose-200 shadow-sm hover:scale-110 transition-transform cursor-default"
        >
          {kw}
        </motion.span>
      ))}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: ReactNode, onClose: () => void, title: string }) {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg h-fit max-h-[90vh] bg-white rounded-3xl shadow-2xl z-[110] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xl text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </>
  );
}

function RoleFitBadge({ archetype, reasoning, className = "" }: { archetype: AnalysisResult['role_fit_archetype'], reasoning: string, className?: string }) {
  const config = {
    'Strong Match': { icon: <Target className="w-3 h-3" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '🎯 Strong Match — hire fast' },
    'Upskillable': { icon: <Wrench className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700 border-blue-200', label: '🔧 Upskillable — needs training' },
    'Career Switcher': { icon: <RefreshCw className="w-3 h-3" />, color: 'bg-purple-100 text-purple-700 border-purple-200', label: '🌀 Career Switcher — transferable skills' },
    'Overqualified': { icon: <GraduationCap className="w-3 h-3" />, color: 'bg-amber-100 text-amber-700 border-amber-200', label: '📚 Overqualified — may leave soon' },
    'Weak Match': { icon: <XCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-700 border-red-200', label: '❌ Weak Match — significant gaps' }
  };

  const { icon, color, label } = config[archetype] || config['Weak Match'];

  return (
    <div className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest cursor-help transition-all hover:scale-105 ${color} ${className}`}>
      {icon}
      <span>{label}</span>
      
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-700 normal-case tracking-normal text-center">
        {reasoning}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, icon }: { label: string, value: number, max: number, icon: ReactNode }) {
  const percentage = (value / max) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="text-indigo-600">{icon}</span>
          {label}
        </div>
        <span className="font-bold text-slate-900">{value} / {max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-indigo-600 rounded-full"
        />
      </div>
    </div>
  );
}
