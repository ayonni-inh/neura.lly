import { Message, Role, UserProfile } from '../types';

export interface UserBelief {
  id: string;
  belief: string;
  firstMentioned: Date;
  lastUpdated: Date;
  frequency: number;
}

export interface ConversationTheme {
  id: string;
  theme: string;
  messages: string[];
  intensity: number; // 1-10
  firstDetected: Date;
  lastDetected: Date;
}

export interface GrowthMetric {
  id: string;
  metric: string;
  baseline: any;
  current: any;
  change: number; // percentage change
  trackedSince: Date;
  lastUpdated: Date;
}

export interface PersonalityProfile {
  id: string;
  communicationStyle: 'direct' | 'collaborative' | 'exploratory' | 'technical';
  emotionalPattern: 'calm' | 'energetic' | 'anxious' | 'focused';
  decisionStyle: 'analytical' | 'intuitive' | 'pragmatic' | 'balanced';
  responsePreference: 'detailed' | 'concise' | 'structured' | 'narrative';
  adaptationScore: number; // how much personality has shifted over time
  lastUpdated: Date;
}

export interface CognitiveState {
  beliefs: UserBelief[];
  themes: ConversationTheme[];
  growthMetrics: GrowthMetric[];
  personality: PersonalityProfile;
  recentPatterns: string[];
}

export class CognitiveEngine {
  private state: CognitiveState;

  constructor(initialState?: CognitiveState) {
    this.state = initialState || {
      beliefs: [],
      themes: [],
      growthMetrics: [],
      personality: {
        id: 'default',
        communicationStyle: 'collaborative',
        emotionalPattern: 'calm',
        decisionStyle: 'balanced',
        responsePreference: 'structured',
        adaptationScore: 0,
        lastUpdated: new Date()
      },
      recentPatterns: []
    };
  }

  /**
   * Generate a reflection on the user's input before responding
   */
  generateReflection(userMessage: string, profile: UserProfile | null): string {
    const beliefs = this.state.beliefs.slice(0, 3).map(b => b.belief).join('; ');
    const themes = this.state.themes.slice(0, 2).map(t => t.theme).join('; ');
    
    let reflection = `Cognitive Analysis:\n`;
    reflection += `- User's core beliefs: ${beliefs || 'Not yet established'}\n`;
    reflection += `- Current conversation themes: ${themes || 'Establishing context'}\n`;
    reflection += `- Personality style detected: ${this.state.personality.communicationStyle}\n`;
    reflection += `- Emotional state: ${this.state.personality.emotionalPattern}\n\n`;
    
    return reflection;
  }

  /**
   * Extract beliefs from user message
   */
  extractBeliefs(message: string): UserBelief[] {
    const beliefPatterns = [
      /i (?:believe|think|know|value|need) that (.+?)[\.\,\;]/gi,
      /i (?:am|'m) (.+?)(?:\.|,)/gi,
      /my (?:goal|vision|purpose) is (.+?)[\.\,\;]/gi
    ];

    const beliefs: UserBelief[] = [];
    
    beliefPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const belief = match[1].trim();
        const existing = this.state.beliefs.find(b => b.belief.toLowerCase() === belief.toLowerCase());
        
        if (existing) {
          existing.frequency += 1;
          existing.lastUpdated = new Date();
        } else {
          beliefs.push({
            id: `belief-${Date.now()}`,
            belief,
            firstMentioned: new Date(),
            lastUpdated: new Date(),
            frequency: 1
          });
        }
      }
    });

    return beliefs;
  }

  /**
   * Detect conversation themes and patterns
   */
  detectThemes(messages: Message[]): ConversationTheme[] {
    const themeKeywords = {
      'Career & Growth': ['job', 'career', 'skill', 'learning', 'growth', 'development', 'advancement'],
      'Relationships': ['friend', 'family', 'team', 'communication', 'connection', 'relationship'],
      'Financial': ['money', 'budget', 'investment', 'cost', 'price', 'expense', 'revenue', 'income'],
      'Health & Energy': ['sleep', 'exercise', 'health', 'tired', 'energy', 'stress', 'burnout'],
      'Creativity & Ideas': ['create', 'design', 'build', 'innovative', 'idea', 'project', 'vision'],
      'Decision Making': ['decide', 'choice', 'option', 'trade-off', 'which', 'whether', 'should']
    };

    const detectedThemes: Map<string, ConversationTheme> = new Map();
    
    messages.forEach(msg => {
      if (msg.role === Role.USER) {
        const text = msg.text.toLowerCase();
        
        Object.entries(themeKeywords).forEach(([themeName, keywords]) => {
          const matches = keywords.filter(kw => text.includes(kw)).length;
          
          if (matches > 0) {
            const existing = this.state.themes.find(t => t.theme === themeName);
            
            if (existing) {
              existing.messages.push(msg.text);
              existing.intensity = Math.min(10, existing.intensity + 1);
              existing.lastDetected = new Date();
            } else {
              detectedThemes.set(themeName, {
                id: `theme-${Date.now()}-${themeName}`,
                theme: themeName,
                messages: [msg.text],
                intensity: matches,
                firstDetected: new Date(),
                lastDetected: new Date()
              });
            }
          }
        });
      }
    });

    return Array.from(detectedThemes.values());
  }

  /**
   * Update personality based on interaction patterns
   */
  adaptPersonality(userMessage: string, assistantResponse: string): void {
    const messageLength = userMessage.split(' ').length;
    const questionCount = (userMessage.match(/\?/g) || []).length;
    const emotionalWords = (userMessage.match(/!(.*?)\!/g) || []).length;

    // Detect communication style
    if (questionCount > 2) {
      this.state.personality.communicationStyle = 'exploratory';
    } else if (userMessage.includes('can you') || userMessage.includes('could you')) {
      this.state.personality.communicationStyle = 'collaborative';
    } else if (messageLength < 20) {
      this.state.personality.communicationStyle = 'concise' as any;
    }

    // Detect emotional pattern
    if (emotionalWords > 0) {
      this.state.personality.emotionalPattern = 'energetic';
    } else if (userMessage.includes('anxious') || userMessage.includes('worried')) {
      this.state.personality.emotionalPattern = 'anxious';
    } else {
      this.state.personality.emotionalPattern = 'calm';
    }

    this.state.personality.lastUpdated = new Date();
  }

  /**
   * Generate structured footer: Insight, Opportunity, Action
   */
  generateIOA(userMessage: string, profile: UserProfile | null): string {
    const primaryTheme = this.state.themes.sort((a, b) => b.intensity - a.intensity)[0];
    const primaryBelief = this.state.beliefs.sort((a, b) => b.frequency - a.frequency)[0];

    const insight = primaryTheme 
      ? `You've been circling around "${primaryTheme.theme}" consistently. This is a core tension point.`
      : `I notice you're dealing with multiple layers—ambition, constraints, and momentum.`;

    const opportunity = primaryBelief
      ? `Your belief that "${primaryBelief.belief}" is powerful, but there's an untapped adjacent opportunity: What if you applied this same conviction to a different domain?`
      : `There's a pattern emerging that could unlock new leverage if you zoom out slightly.`;

    const action = userMessage.toLowerCase().includes('should') || userMessage.toLowerCase().includes('need')
      ? `Pick one specific action from this conversation and execute it today. The clarity will come from momentum, not planning.`
      : `Before our next conversation, spend 15 minutes documenting your answer to this: "What's the one constraint I'm not openly naming?"`;

    return `\n---\n**Insight:** ${insight}\n**Opportunity:** ${opportunity}\n**Action:** ${action}\n---`;
  }

  /**
   * Build context window for API prompt injection
   */
  buildContextInjection(profile: UserProfile | null): string {
    const recentBeliefs = this.state.beliefs.slice(0, 3);
    const activeThemes = this.state.themes.filter(t => t.intensity > 2).slice(0, 2);

    let context = `\n## User Context & Cognitive State:\n`;
    
    if (profile) {
      context += `**User Profile:** ${profile.name} | Role: ${profile.role} | Goals: ${profile.goals.join(', ')}\n`;
    }

    if (recentBeliefs.length > 0) {
      context += `**Core Beliefs:** ${recentBeliefs.map(b => `"${b.belief}"`).join(', ')}\n`;
    }

    if (activeThemes.length > 0) {
      context += `**Active Themes:** ${activeThemes.map(t => `${t.theme} (intensity: ${t.intensity}/10)`).join('; ')}\n`;
    }

    context += `**Personality Style:** ${this.state.personality.communicationStyle} communicator | ${this.state.personality.emotionalPattern} emotional state | ${this.state.personality.decisionStyle} decision maker\n`;

    context += `\n## Key Instruction: Apply the Mirror Principle. Reflect contradictions gently. Prioritize momentum over perfection. End with Insight/Opportunity/Action structured footer.\n`;

    return context;
  }

  /**
   * Update full cognitive state
   */
  updateState(messages: Message[], userProfile: UserProfile | null): void {
    // Extract and update beliefs
    const newBeliefs = this.extractBeliefs(
      messages.filter(m => m.role === Role.USER).map(m => m.text).join(' ')
    );
    this.state.beliefs.push(...newBeliefs);
    this.state.beliefs = this.state.beliefs.filter((b, i, arr) => arr.findIndex(x => x.belief.toLowerCase() === b.belief.toLowerCase()) === i);

    // Detect themes
    const newThemes = this.detectThemes(messages);
    this.state.themes.push(...newThemes);

    // Update personality
    if (messages.length > 0) {
      const lastUserMsg = messages.filter(m => m.role === Role.USER).pop();
      const lastAssistantMsg = messages.filter(m => m.role === Role.MODEL).pop();
      if (lastUserMsg && lastAssistantMsg) {
        this.adaptPersonality(lastUserMsg.text, lastAssistantMsg.text);
      }
    }
  }

  /**
   * Get current cognitive state
   */
  getState(): CognitiveState {
    return this.state;
  }

  /**
   * Set cognitive state (for loading from storage)
   */
  setState(newState: CognitiveState): void {
    this.state = newState;
  }
}

export const createCognitiveEngine = (initialState?: CognitiveState): CognitiveEngine => {
  return new CognitiveEngine(initialState);
};
