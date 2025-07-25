import { BeatDetector, BeatCandidate, MusicStyle } from './beatDetector'

/**
 * 节拍强度（数字枚举：0=弱，1=中，2=强）
 */
export enum BeatStrength {
  WEAK = 0,
  MEDIUM = 1,
  STRONG = 2,
}

/**
 * 带强度信息的节拍
 */
export interface Beat {
  time: number
  index: number
  strength: BeatStrength
  energy: number
  barIndex: number
  beatInBar: number
}

/**
 * BPM分析结果
 */
export interface BPMResult {
  bpm: number
  confidence: number
  beats: Beat[]
  barCount: number
  beatsPerBar: number
  detectedBeatsPerBar: number
}

/**
 * BPM分析器配置
 */
export interface BPMAnalyzerOptions {
  minBPM?: number
  maxBPM?: number
  beatsPerBar?: number // 手动指定，不指定则用检测值
  style?: MusicStyle
  maxConsecutiveStrong?: number
  filterWeakBeats?: boolean // 是否过滤低能量弱拍
}

/**
 * BPM分析器（优化节拍数量，按实际拍号划分）
 */
export class BPMAnalyzer {
  private beatCandidates: BeatCandidate[]
  private sampleRate: number
  private options: Required<BPMAnalyzerOptions>

  constructor(
    audioBuffer: AudioBuffer,
    beatCandidates: BeatCandidate[],
    options: BPMAnalyzerOptions = {}
  ) {
    this.beatCandidates = beatCandidates
    this.sampleRate = audioBuffer.sampleRate
    this.options = {
      minBPM: 60,
      maxBPM: 180,
      beatsPerBar: 0, // 不指定则用检测值
      style: MusicStyle.DEFAULT,
      maxConsecutiveStrong: 2,
      filterWeakBeats: true, // 默认过滤低能量弱拍
      ...options,
    }

    // 低BPM音频适配
    if (this.options.style === MusicStyle.LOW_ENERGY) {
      this.options.minBPM = 50
      this.options.maxBPM = 100
    }
  }

  /**
   * 执行分析，生成最终结果（过滤冗余节拍）
   */
  analyze(): BPMResult {
    // 增强弱候选（避免过少）
    const enhancedCandidates = this.enhanceWeakCandidates()
    // 计算BPM和置信度
    const { bpm, confidence } = this.calculateBPM(enhancedCandidates)
    // 检测实际拍号（优先使用检测值）
    const detectedBeatsPerBar = this.detectBeatsPerBar(enhancedCandidates, bpm)
    const effectiveBeatsPerBar =
      this.options.beatsPerBar > 0 ? this.options.beatsPerBar : detectedBeatsPerBar
    // 分类节拍强度
    let beatsWithStrength = this.classifyBeatStrengths(
      enhancedCandidates,
      bpm,
      effectiveBeatsPerBar
    )
    // 过滤低能量弱拍
    if (this.options.filterWeakBeats) {
      beatsWithStrength = this.filterLowEnergyWeakBeats(beatsWithStrength)
    }
    // 按实际拍号划分小节
    const beats = this.addBarInfo(beatsWithStrength, effectiveBeatsPerBar)

    return {
      bpm,
      confidence: Math.round(confidence * 1000) / 1000,
      beats,
      barCount: Math.ceil(beats.length / effectiveBeatsPerBar),
      beatsPerBar: effectiveBeatsPerBar,
      detectedBeatsPerBar,
    }
  }

  /**
   * 增强弱候选（避免过少，不过度生成）
   */
  private enhanceWeakCandidates(): BeatCandidate[] {
    if (this.beatCandidates.length >= 10) return this.beatCandidates

    // 基于预估BPM生成补充节拍（控制数量）
    const estimatedBpm = this.estimateInitialBpm()
    const interval = (60 / estimatedBpm) * this.sampleRate
    const totalLength = this.beatCandidates.length
      ? this.beatCandidates[this.beatCandidates.length - 1].position
      : this.sampleRate * 10

    const enhanced = [...this.beatCandidates]
    let currentPos = enhanced.length ? enhanced[enhanced.length - 1].position : 0
    const maxAdditionalBeats = 10 // 最多补充10个，避免过多
    let addedBeats = 0

    while (currentPos < totalLength && addedBeats < maxAdditionalBeats) {
      currentPos += interval
      enhanced.push({
        time: parseFloat((currentPos / this.sampleRate).toFixed(2)),
        position: currentPos,
        energy: 0.05,
      })
      addedBeats++
    }

    return enhanced.sort((a, b) => a.position - b.position)
  }

  /**
   * 预估初始BPM
   */
  private estimateInitialBpm(): number {
    if (this.beatCandidates.length < 2)
      return this.options.style === MusicStyle.LOW_ENERGY ? 60 : 120

    const intervals = this.beatCandidates
      .slice(1)
      .map((c, i) => (c.position - this.beatCandidates[i].position) / this.sampleRate)
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length
    return Math.min(this.options.maxBPM, Math.max(this.options.minBPM, 60 / avgInterval))
  }

  /**
   * 计算BPM和置信度
   */
  private calculateBPM(candidates: BeatCandidate[]): {
    bpm: number
    confidence: number
  } {
    const intervals = this.calculateIntervals(candidates)
    if (intervals.length === 0) {
      return { bpm: this.options.minBPM, confidence: 0.2 }
    }

    const bpmCandidates = this.generateBpmCandidates(intervals)
    const sortedCandidates = bpmCandidates.sort((a, b) => b.score - a.score)
    const topCandidates = sortedCandidates.slice(0, 5)
    const topScore = topCandidates[0].score
    const secondScore = topCandidates[1]?.score || 0
    const totalScore = topCandidates.reduce((sum, c) => sum + c.score, 0)

    const bpmValues = topCandidates.map((c) => c.bpm)
    const bpmStdDev = this.calculateStandardDeviation(bpmValues)
    const concentrationPenalty = Math.min(1, 1 + bpmStdDev / 20)
    const lowBpmBonus = topCandidates[0].bpm < 80 ? 1.2 : 1

    return {
      bpm: Math.round(topCandidates[0].bpm),
      confidence:
        totalScore > 0
          ? Math.min(
              1,
              (((topScore / totalScore) * Math.min(5, topScore / (secondScore || 1))) /
                concentrationPenalty) *
                lowBpmBonus
            )
          : 0.2,
    }
  }

  /**
   * 计算节拍间隔（过滤异常值）
   */
  private calculateIntervals(candidates: BeatCandidate[]): number[] {
    const intervals: number[] = []
    const minInterval = (60 / this.options.maxBPM) * 0.5
    const maxInterval = (60 / this.options.minBPM) * 2

    for (let i = 1; i < candidates.length; i++) {
      const interval = (candidates[i].position - candidates[i - 1].position) / this.sampleRate
      if (interval >= minInterval && interval <= maxInterval) {
        intervals.push(interval)
      }
    }
    return intervals
  }

  /**
   * 生成BPM候选及评分
   */
  private generateBpmCandidates(intervals: number[]): Array<{ bpm: number; score: number }> {
    const { minBPM, maxBPM } = this.options
    const candidates: Array<{ bpm: number; score: number }> = []
    const isLowEnergy = this.options.style === MusicStyle.LOW_ENERGY
    const step = isLowEnergy ? 0.25 : 0.5

    for (let bpm = minBPM; bpm <= maxBPM; bpm += step) {
      const targetInterval = 60 / bpm
      let score = 0

      intervals.forEach((interval) => {
        for (const multiple of [0.5, 1, 2, 4]) {
          const tolerance = isLowEnergy ? 0.15 : 0.1
          if (
            Math.abs(interval - targetInterval * multiple) <
            targetInterval * multiple * tolerance
          ) {
            const weight = multiple === 1 && bpm < 80 ? 1.5 : 1
            score += (1 / multiple) * weight
            break
          }
        }
      })

      const lowBpmBoost = bpm < 80 ? 1.3 : 1
      candidates.push({ bpm, score: score * lowBpmBoost })
    }

    return candidates
  }

  /**
   * 自动检测每小节拍数（优先使用实际拍号）
   */
  private detectBeatsPerBar(candidates: BeatCandidate[], bpm: number): number {
    const minRequiredBeats = 8
    if (candidates.length < minRequiredBeats) {
      return 4 // 不足则用默认
    }

    const candidatesToCheck = [2, 3, 4, 6]
    const scores = candidatesToCheck.map((beatsPerBar) => ({
      beatsPerBar,
      score: this.evaluateBeatsPerBarScore(candidates, beatsPerBar, bpm),
    }))

    const topScore = scores.sort((a, b) => b.score - a.score)[0]
    // 低BPM优先2/4拍
    if (bpm < 70 && topScore.beatsPerBar === 2) {
      return 2
    }
    return topScore.beatsPerBar
  }

  /**
   * 评估每小节拍数的匹配度
   */
  private evaluateBeatsPerBarScore(
    candidates: BeatCandidate[],
    beatsPerBar: number,
    bpm: number
  ): number {
    const positionEnergies: number[] = Array(beatsPerBar).fill(0)
    const positionCounts: number[] = Array(beatsPerBar).fill(0)

    candidates.forEach((c, i) => {
      const pos = i % beatsPerBar
      positionEnergies[pos] += c.energy
      positionCounts[pos]++
    })

    const avgEnergies = positionEnergies.map((e, i) =>
      positionCounts[i] > 0 ? e / positionCounts[i] : 0
    )

    let score = 0
    // 2/4拍规则：强-弱（第一拍>第二拍）
    if (beatsPerBar === 2) {
      if (avgEnergies[0] > avgEnergies[1] * 1.2) {
        score += 3 // 提高2/4拍权重
      }
    }
    // 4/4拍规则：强-弱-次强-弱
    else if (beatsPerBar === 4) {
      if (
        avgEnergies[0] > avgEnergies[2] * 1.1 &&
        avgEnergies[2] > avgEnergies[1] &&
        avgEnergies[2] > avgEnergies[3]
      ) {
        score += 2
      }
    }

    return score
  }

  /**
   * 分类节拍强度（减少弱拍数量）
   */
  private classifyBeatStrengths(
    candidates: BeatCandidate[],
    bpm: number,
    beatsPerBar: number
  ): Array<{
    time: number
    index: number
    strength: BeatStrength
    energy: number
  }> {
    const energies = candidates.map((c) => c.energy)
    const avgEnergy = energies.reduce((sum, e) => sum + e, 0) / energies.length
    const stdDev = this.calculateStandardDeviation(energies)
    const isLowEnergy = this.options.style === MusicStyle.LOW_ENERGY

    // 提高弱拍阈值，减少弱拍数量
    const strongThreshold = isLowEnergy ? avgEnergy + stdDev * 0.5 : avgEnergy + stdDev * 0.7
    const mediumThreshold = isLowEnergy ? avgEnergy - stdDev * 0.05 : avgEnergy - stdDev * 0.1

    const prevStrengths: BeatStrength[] = []

    return candidates.map((c, index) => {
      const beatInBar = (index % beatsPerBar) + 1
      let strength: BeatStrength = BeatStrength.WEAK

      // 按实际拍号划分强度
      if (beatsPerBar === 2) {
        // 2/4拍：强-弱
        strength =
          beatInBar === 1
            ? c.energy >= strongThreshold
              ? BeatStrength.STRONG
              : BeatStrength.MEDIUM
            : c.energy >= mediumThreshold * 1.2
            ? BeatStrength.MEDIUM
            : BeatStrength.WEAK
      } else {
        // 4/4拍：强-弱-次强-弱
        if (beatInBar === 1) {
          strength = c.energy >= strongThreshold ? BeatStrength.STRONG : BeatStrength.MEDIUM
        } else if (beatInBar === 3) {
          strength = c.energy >= mediumThreshold ? BeatStrength.MEDIUM : BeatStrength.WEAK
        } else {
          strength = c.energy >= mediumThreshold * 1.2 ? BeatStrength.MEDIUM : BeatStrength.WEAK
        }
      }

      // 限制连续强拍
      const maxConsecutive = isLowEnergy ? 3 : this.options.maxConsecutiveStrong
      if (strength === BeatStrength.STRONG) {
        const consecutiveStrong = prevStrengths
          .slice(-maxConsecutive)
          .filter((s) => s === BeatStrength.STRONG).length
        if (consecutiveStrong >= maxConsecutive) {
          strength = BeatStrength.MEDIUM
        }
      }

      prevStrengths.push(strength)
      if (prevStrengths.length > maxConsecutive * 2) {
        prevStrengths.shift()
      }

      return {
        time: c.time,
        index,
        strength,
        energy: parseFloat(c.energy.toFixed(3)),
      }
    })
  }

  /**
   * 过滤低能量弱拍（strength=0且energy<阈值）
   */
  private filterLowEnergyWeakBeats(
    beats: Array<{
      time: number
      index: number
      strength: BeatStrength
      energy: number
    }>
  ): Array<{
    time: number
    index: number
    strength: BeatStrength
    energy: number
  }> {
    if (!this.options.filterWeakBeats) return beats

    // 计算弱拍过滤阈值（弱拍能量的60%）
    const weakBeats = beats.filter((b) => b.strength === BeatStrength.WEAK)
    if (weakBeats.length === 0) return beats
    const avgWeakEnergy = weakBeats.reduce((sum, b) => sum + b.energy, 0) / weakBeats.length
    const weakFilterThreshold = avgWeakEnergy * 0.6

    // 保留：强拍、中拍、能量较高的弱拍
    return beats.filter(
      (beat) => beat.strength !== BeatStrength.WEAK || beat.energy >= weakFilterThreshold
    )
  }

  /**
   * 按实际拍号添加小节信息
   */
  private addBarInfo(
    beats: Array<{
      time: number
      index: number
      strength: BeatStrength
      energy: number
    }>,
    beatsPerBar: number
  ): Beat[] {
    return beats.map((beat, index) => ({
      ...beat,
      barIndex: Math.floor(index / beatsPerBar),
      beatInBar: (index % beatsPerBar) + 1,
    }))
  }

  /**
   * 计算标准差
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }
}

/**
 * 便捷工厂函数
 */
export async function analyzeAudioBPM(
  audioBuffer: AudioBuffer,
  options: BPMAnalyzerOptions = {}
): Promise<BPMResult> {
  const beatDetector = new BeatDetector(audioBuffer, {
    style: options.style,
    weakBeatFilter: options.filterWeakBeats !== false,
  })
  const candidates = beatDetector.detectCandidates()
  const analyzer = new BPMAnalyzer(audioBuffer, candidates, options)
  return analyzer.analyze()
}

export default BPMAnalyzer
