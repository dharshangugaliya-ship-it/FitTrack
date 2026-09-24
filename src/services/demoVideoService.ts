/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivityType } from '../types';

export interface ExerciseFormGuideline {
  activity: ActivityType;
  exerciseName: string;
  category: string;
  difficultyFocus: string;
  defaultVideoUrl: string;
  posterUrl: string;
  movementPhases: Array<{ name: string; description: string; targetAngle?: string }>;
  formPoints: string[];
  commonMistakes: string[];
  targetMuscles: string[];
  biomechanicalMetrics: {
    primaryJoint: string;
    targetAngleRange: string;
    optimalCadence?: string;
    formTolerance: string;
  };
}

/**
 * Curated Exercise Demonstration & Form Library
 * Grounded in biomechanical standards used by FITTRACK's computer vision pipeline.
 */
export const EXERCISE_DEMO_CATALOG: Record<ActivityType, ExerciseFormGuideline> = {
  SQUATS: {
    activity: 'SQUATS',
    exerciseName: 'Deep Bodyweight Squats',
    category: 'Lower Body Strength & Endurance',
    difficultyFocus: 'Full Hip-Depth & Knee Collinearity',
    defaultVideoUrl: 'https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Athletic Setup', description: 'Feet shoulder-width apart, toes pointed 15°–30° outward. Core braced.', targetAngle: '165°–180°' },
      { name: '2. Controlled Descent', description: 'Hips hinge backward and down simultaneously. Chest remains proud and open.', targetAngle: '120°–140°' },
      { name: '3. Inflection Depth', description: 'Hip crease breaks below the top of the knee. Knees track over 2nd toes.', targetAngle: '≤ 85° (Parallel)' },
      { name: '4. Concentric Ascent', description: 'Drive upward pushing the ground away through midfoot and heels.', targetAngle: '120°–160°' },
      { name: '5. Lockout & Reset', description: 'Full extension of knees and hips without hyperextending the lower spine.', targetAngle: '175°–180°' },
    ],
    formPoints: [
      'Stance: Place feet roughly shoulder-width apart with toes flared out 15° to 30°.',
      'Descent: Hips break back and down simultaneously; never let knees cave inward (valgus collapse).',
      'Target Depth: Break parallel so hip crease is below the top of the knee cap (≤ 85° knee flexion).',
      'Torso Angle: Maintain a proud chest and neutral lumbar spine; avoid excessive forward tilt.',
      'Ascent & Lockout: Drive through midfoot, squeezing glutes and quads to complete repetition.',
    ],
    commonMistakes: [
      'Knees caving inward on ascent (knee valgus)',
      'Heels lifting off the ground (weight shifted to toes)',
      'Cutting depth short before thighs break horizontal parallel',
      'Rounding lower back into flexion (butt wink)',
    ],
    targetMuscles: ['Quadriceps', 'Gluteus Maximus', 'Hamstrings', 'Core & Erector Spinae'],
    biomechanicalMetrics: {
      primaryJoint: 'Bilateral Knee & Hip Flexion',
      targetAngleRange: '≤ 85° at lowest inflection point',
      optimalCadence: '2.0 - 2.8 seconds per repetition cycle',
      formTolerance: '± 5° camera perspective compensation',
    },
  },

  PUSH_UPS: {
    activity: 'PUSH_UPS',
    exerciseName: 'Standard Military Push-Ups',
    category: 'Upper Body Pushing & Core Rigidity',
    difficultyFocus: '90° Elbow Flexion & Full Lockout',
    defaultVideoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. High Plank Plank Base', description: 'Hands slightly wider than shoulders, fingers spread, body rigid.', targetAngle: '175°–180°' },
      { name: '2. Eccentric Lowering', description: 'Lower body as a solid unit; elbows track back at 45° arrow shape.', targetAngle: '120°–100°' },
      { name: '3. Bottom Depth Point', description: 'Chest touches or hovers 2 inches above floor; elbows reach 90° flexion.', targetAngle: '≤ 90°' },
      { name: '4. Powerful Press', description: 'Drive palms down into floor, maintaining continuous abdominal tension.', targetAngle: '130°–170°' },
      { name: '5. Protraction Lockout', description: 'Full extension of elbows with active shoulder blade protraction.', targetAngle: '180°' },
    ],
    formPoints: [
      'Hand Placement: Slightly wider than shoulder-width, fingers pointing forward or slightly outward.',
      'Torso Alignment: Maintain an unbroken rigid plank line from crown of head down to heels.',
      'Elbow Path: Keep elbows tracking back at a 45-degree angle to torso (arrow shape, not T-shape).',
      'Depth: Descend until upper arm is at least parallel with torso (90-degree elbow bend).',
      'Lockout: Return all the way to starting position with arms fully extended before next rep.',
    ],
    commonMistakes: [
      'Flaring elbows out wide at 90° (places high shear stress on anterior shoulder capsule)',
      'Sagging hips or hyperextending lumbar spine due to loose core',
      'Craning chin down to touch floor early instead of lowering full chest',
      'Incomplete push without locking out elbows at the top',
    ],
    targetMuscles: ['Pectoralis Major', 'Anterior Deltoids', 'Triceps Brachii', 'Rectus Abdominis'],
    biomechanicalMetrics: {
      primaryJoint: 'Bilateral Elbow Joint Angle',
      targetAngleRange: '≤ 90° at bottom, 180° at top lockout',
      optimalCadence: '1.8 - 2.5 seconds per rep',
      formTolerance: 'Body collinearity angle within 15° of linear',
    },
  },

  PLANK: {
    activity: 'PLANK',
    exerciseName: 'Forearm Isometric Plank',
    category: 'Core Stability & Anti-Extension',
    difficultyFocus: 'Continuous Horizontal Collinearity',
    defaultVideoUrl: 'https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/echo-hereweare.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Foundation Stance', description: 'Elbows directly under shoulders, forearms flat, feet hip-width.', targetAngle: 'Collinear 180°' },
      { name: '2. Isometric Core Brace', description: 'Pelvis tucked slightly into posterior tilt; glutes and quads locked.', targetAngle: 'Torso delta < 10°' },
      { name: '3. Cervical Neutrality', description: 'Neck aligned with spine; eyes focused on floor between thumbs.', targetAngle: 'Neutral' },
      { name: '4. Controlled Respiration', description: 'Diaphragmatic breaths while sustaining continuous abdominal wall tension.', targetAngle: 'Steady Hold' },
    ],
    formPoints: [
      'Elbow Position: Stack elbows directly beneath shoulders with forearms flat on floor.',
      'Spine Collinearity: Create a straight, horizontal bridge from ears through shoulders, hips, and ankles.',
      'Pelvic Tilt: Engage posterior pelvic tilt (tuck tailbone slightly) to protect lower back.',
      'Neck Alignment: Look at the floor about 6 inches forward; do not let head drop or crane up.',
      'Steady Breathing: Inhale through nose and exhale through mouth without releasing core tension.',
    ],
    commonMistakes: [
      'Sagging hips toward floor (anterior pelvic tilt causing lumbar compression)',
      'Piking hips upward into an inverted V (shifts load away from abdominals)',
      'Holding breath and inducing Valsalva pressure spike',
      'Collapsing shoulder blades together (winging scapulae)',
    ],
    targetMuscles: ['Transverse Abdominis', 'Rectus Abdominis', 'Internal/External Obliques', 'Glutes'],
    biomechanicalMetrics: {
      primaryJoint: 'Spine-to-Horizontal Alignment Angle',
      targetAngleRange: 'Deviation ≤ 12° from horizontal plane',
      optimalCadence: 'Continuous hold verified second-by-second',
      formTolerance: 'Automatic pause if hip elevation exceeds ±15°',
    },
  },

  RUNNING: {
    activity: 'RUNNING',
    exerciseName: 'Cardio & Cadence Running',
    category: 'Aerobic Conditioning & Endurance',
    difficultyFocus: 'Midfoot Strike & 170+ SPM Cadence',
    defaultVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Posture & Lean', description: 'Tall spine with subtle whole-body forward lean starting from ankles.' },
      { name: '2. Midfoot Landing', description: 'Foot lands directly underneath the center of gravity; avoids braking.' },
      { name: '3. Hip Extension', description: 'Glutes fire to propel body forward; knee drives forward smoothly.' },
      { name: '4. Arm Carriage', description: 'Arms swing at 90° rhythmically without crossing the torso midline.' },
    ],
    formPoints: [
      'Lean from Ankles: Maintain a gentle 5-degree forward lean originating from ankles, not waist.',
      'Foot Strike: Land lightly on midfoot under your hips rather than overstriding on locked heels.',
      'Arm Drive: Bend elbows at 90 degrees and swing front-to-back; relax shoulders away from ears.',
      'Cadence: Strive for a brisk cadence of 165–180 steps per minute to minimize joint impact.',
    ],
    commonMistakes: [
      'Overstriding with straight knee leading to heel braking forces',
      'Excessive vertical bounce (wasting energy going up instead of forward)',
      'Hunched shoulders and clenched fists restricting breathing',
    ],
    targetMuscles: ['Calves (Gastrocnemius/Soleus)', 'Quadriceps', 'Hamstrings', 'Cardiovascular System'],
    biomechanicalMetrics: {
      primaryJoint: 'Cadence & Vertical Oscillation',
      targetAngleRange: 'Knee flexion 30°–40° on impact',
      optimalCadence: '165 - 180 steps/min',
      formTolerance: 'GPS telemetry / step frequency match',
    },
  },

  WALKING: {
    activity: 'WALKING',
    exerciseName: 'Brisk Aerobic Walking',
    category: 'Low-Impact Cardio & Daily Consistency',
    difficultyFocus: 'Heel-to-Toe Roll & Active Posture',
    defaultVideoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Upright Alignment', description: 'Shoulders back, eyes forward, ribcage lifted.' },
      { name: '2. Smooth Heel Strike', description: 'Heel makes soft initial ground contact.' },
      { name: '3. Plantar Roll', description: 'Weight rolls naturally along the outer foot to ball of foot.' },
      { name: '4. Toe-off Propulsion', description: 'Big toe provides final forward push-off.' },
    ],
    formPoints: [
      'Posture: Keep head held high, shoulders relaxed down, and gaze 15–20 feet ahead.',
      'Footwork: Strike gently with heel, roll smoothly through arch, and push off with toes.',
      'Stride: Take natural, rhythmic strides rather than excessively lengthening your step.',
      'Arm Swing: Bend arms gently at 90 degrees and swing naturally with alternating footsteps.',
    ],
    commonMistakes: [
      'Looking down at feet causing neck strain and slumping shoulders',
      'Over-striding which jars hips and lower back',
      'Shuffling feet without complete heel-to-toe articulation',
    ],
    targetMuscles: ['Calves', 'Tibialis Anterior', 'Hamstrings', 'Gluteals'],
    biomechanicalMetrics: {
      primaryJoint: 'Step Cadence & Stride Consistency',
      targetAngleRange: 'Continuous rhythmic locomotion',
      optimalCadence: '100 - 125 steps/min',
      formTolerance: 'Standard pedometer / GPS match',
    },
  },

  CYCLING: {
    activity: 'CYCLING',
    exerciseName: 'Cadence Cycling & Spin Mechanics',
    category: 'Low-Impact Aerobic Endurance',
    difficultyFocus: '85-95 RPM Cadence & 25-35° Knee Angle',
    defaultVideoUrl: 'https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Cockpit Ergonomics', description: 'Seat height set so knee retains slight 25°–35° bend at bottom.' },
      { name: '2. Power Phase (12 to 5 o’clock)', description: 'Drive through quad and glute smoothly downward.' },
      { name: '3. Transition (5 to 7 o’clock)', description: 'Scrape mud off shoe sole across the bottom.' },
      { name: '4. Recovery (7 to 12 o’clock)', description: 'Unweight pedal as opposite leg applies power.' },
    ],
    formPoints: [
      'Saddle Height: When pedal is at lowest point (6 o’clock), knee should maintain a 25°–35° flexion.',
      'Pedal Stroke: Think in full 360-degree circles rather than merely stomping downward.',
      'Upper Body: Keep arms relaxed with soft elbows and flat wrists on handlebars.',
      'Cadence: Maintain a fluid cadence of 80–95 RPM in moderate gear rather than grinding hard gears.',
    ],
    commonMistakes: [
      'Saddle too low causing excessive anterior knee strain and patellar pain',
      'Rocking hips from side to side indicating saddle is set too high',
      'Gripping handlebars with locked straight elbows jarring the spine',
    ],
    targetMuscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Soleus/Calves'],
    biomechanicalMetrics: {
      primaryJoint: 'Knee Flexion Extension Cycle',
      targetAngleRange: '25°–35° at 6 o’clock extension',
      optimalCadence: '80 - 95 RPM',
      formTolerance: 'Speed & Power output metrics',
    },
  },

  SKIPPING: {
    activity: 'SKIPPING',
    exerciseName: 'Speed Jump Rope & Footwork',
    category: 'Plyometric Agility & Conditioning',
    difficultyFocus: 'Wrist Rotations & Low Ground Clearance',
    defaultVideoUrl: 'https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/echo-hereweare.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Ready Stance', description: 'Elbows tucked close to ribs; handles held at 45° angle.' },
      { name: '2. Wrist Initiation', description: 'Rope driven by wrist circular motions, not shoulder flailing.' },
      { name: '3. Low Ground Clearance', description: 'Jump only 1 to 2 inches off floor with soft elastic knees.' },
      { name: '4. Spring Bounce', description: 'Spring solely off balls of feet; heels stay off floor.' },
    ],
    formPoints: [
      'Wrist Drive: Turn the rope using subtle circular wrist movements, keeping elbows pinned close to ribs.',
      'Jump Height: Clear the rope by just 1 to 2 inches; avoid excessive donkey kicks or knee tucks.',
      'Soft Landings: Land and spring strictly on the balls of your feet with knees slightly unlocked.',
      'Torso Alignment: Maintain an upright posture and resist looking down or leaning forward.',
    ],
    commonMistakes: [
      'Swinging rope with whole arms/shoulders leading to rapid fatigue and tripping',
      'Jumping too high and landing hard on flat feet or locked knees',
      'Kicking feet backward (donkey kick) disrupting timing',
    ],
    targetMuscles: ['Gastrocnemius & Soleus', 'Shoulders & Forearms', 'Core Stabilizers'],
    biomechanicalMetrics: {
      primaryJoint: 'Ankle Plantarflexion & Knee Cushioning',
      targetAngleRange: 'Vertical clearance 2–5 cm',
      optimalCadence: '120 - 160 jumps/min',
      formTolerance: 'Continuous rhythm without rope catches',
    },
  },

  SWIMMING: {
    activity: 'SWIMMING',
    exerciseName: 'Freestyle Streamline Stroke',
    category: 'Full-Body Low-Impact Aerobics',
    difficultyFocus: 'High-Elbow Catch & Bilateral Breathing',
    defaultVideoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Hand Entry', description: 'Fingertips enter water between head and shoulder line.' },
      { name: '2. High-Elbow Catch', description: 'Elbow stays high as forearm anchors into water.' },
      { name: '3. Underwater Pull', description: 'Accelerate water backward past hips.' },
      { name: '4. Body Rotation', description: 'Torso rotates along longitudinal axis from hips.' },
    ],
    formPoints: [
      'Head Position: Look downward toward pool bottom so water line hits the hairline; keeps hips buoyant.',
      'High Elbow Catch: Bend elbow early in underwater catch to pull backward rather than pushing down.',
      'Hip Kick: Initiate flutter kick from hips with pointed toes and minimal knee flexion.',
      'Longitudinal Rotation: Rotate body 30° to 45° side-to-side with each stroke for maximum reach.',
    ],
    commonMistakes: [
      'Lifting head forward to breathe (drops hips and creates massive drag)',
      'Bending knees excessively during kick (like riding a bicycle in water)',
      'Crossing hand over center line during entry',
    ],
    targetMuscles: ['Latissimus Dorsi', 'Deltoids', 'Pectorals', 'Core & Hip Flexors'],
    biomechanicalMetrics: {
      primaryJoint: 'Glenohumeral Joint & Torso Axis',
      targetAngleRange: 'High elbow angle 100°–120° in catch',
      optimalCadence: '50 - 70 strokes/min',
      formTolerance: 'Streamline hydrodynamic integrity',
    },
  },

  YOGA: {
    activity: 'YOGA',
    exerciseName: 'Sun Salutation (Surya Namaskar)',
    category: 'Flexibility, Balance & Mindful Alignment',
    difficultyFocus: 'Breath Synchronization & Spine Elongation',
    defaultVideoUrl: 'https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/echo-hereweare.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
    movementPhases: [
      { name: '1. Pranamasana (Mountain)', description: 'Feet grounded, hands at heart center, spine tall.' },
      { name: '2. Hastauttanasana', description: 'Inhale, sweep arms overhead, gentle upper thoracic arch.' },
      { name: '3. Uttanasana (Forward Fold)', description: 'Exhale, fold from hips with elongated spine.' },
      { name: '4. Ashwa Sanchalanasana', description: 'Inhale, step one leg back, sink hips, lift chest.' },
      { name: '5. Adho Mukha Svanasana', description: 'Exhale to Downward Dog; press chest toward thighs.' },
    ],
    formPoints: [
      'Ujjayi Breath: Inhale and exhale through nose with soft throat constriction matching each pose.',
      'Hips Before Back: In forward bends, hinge from hip joints and soften knees rather than rounding spine.',
      'Hand Rooting: Spread fingers wide and press through knuckles to relieve wrist pressure.',
      'Core Engagement: Gently draw lower abdomen inward to support lumbar vertebrae.',
    ],
    commonMistakes: [
      'Forcing flexibility by rounding thoracic and lumbar spine excessively',
      'Collapsing all body weight into wrists in plank or downward dog',
      'Holding breath during challenging transitions',
    ],
    targetMuscles: ['Hamstrings', 'Spinal Erectors', 'Shoulder Girdle', 'Hip Flexors'],
    biomechanicalMetrics: {
      primaryJoint: 'Full-Body Kinematic Chain',
      targetAngleRange: 'Harmonic joint transitions',
      optimalCadence: '3 - 5 breath cycles per posture',
      formTolerance: 'Spine decompression & balance stability',
    },
  },
};

/**
 * IndexedDB Storage Engine for Organizer Uploaded Video Files
 * Allows local uploads up to 100MB+ without hitting localStorage size quotas.
 */
const DB_NAME = 'fittrack_media_vault';
const DB_VERSION = 1;
const STORE_VIDEOS = 'exercise_videos';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export const demoVideoService = {
  /**
   * Retrieves full exercise demonstration specifications by activity.
   */
  getExerciseGuideline(activity: ActivityType): ExerciseFormGuideline {
    return EXERCISE_DEMO_CATALOG[activity] || EXERCISE_DEMO_CATALOG.SQUATS;
  },

  /**
   * Stores an organizer's uploaded video file into IndexedDB and returns a persistent key and local Object URL.
   */
  async storeUploadedVideoFile(file: File): Promise<{
    storageKey: string;
    objectUrl: string;
    fileName: string;
    fileSizeMb: number;
    mimeType: string;
  }> {
    const db = await openDatabase();
    const id = `idb_vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const objectUrl = URL.createObjectURL(file);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const record = {
        id,
        blob: file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      };

      const putReq = store.put(record);
      putReq.onsuccess = () => {
        resolve({
          storageKey: id,
          objectUrl,
          fileName: file.name,
          fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
          mimeType: file.type,
        });
      };
      putReq.onerror = () => reject(putReq.error || new Error('Failed to save video to database'));
    });
  },

  /**
   * Resolves a video storage key or URL into a playable URL.
   * If key starts with 'idb_vid_', fetches Blob from IndexedDB and generates Object URL.
   */
  async resolveVideoUrl(keyOrUrl?: string | null, fallbackActivity: ActivityType = 'SQUATS'): Promise<string> {
    const defaultUrl = this.getExerciseGuideline(fallbackActivity).defaultVideoUrl;
    if (!keyOrUrl || keyOrUrl.trim() === '') {
      return defaultUrl;
    }

    // Auto-migrate broken Google sample bucket links
    if (keyOrUrl.includes('commondatastorage.googleapis.com')) {
      return defaultUrl;
    }

    if (keyOrUrl.startsWith('idb_vid_')) {
      try {
        const db = await openDatabase();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_VIDEOS, 'readonly');
          const store = tx.objectStore(STORE_VIDEOS);
          const req = store.get(keyOrUrl);
          req.onsuccess = () => {
            if (req.result && req.result.blob) {
              const url = URL.createObjectURL(req.result.blob);
              resolve(url);
            } else {
              resolve(defaultUrl);
            }
          };
          req.onerror = () => {
            resolve(defaultUrl);
          };
        });
      } catch {
        return defaultUrl;
      }
    }

    return keyOrUrl;
  },

  /**
   * Cleans up an uploaded video from storage.
   */
  async deleteUploadedVideo(storageKey: string): Promise<void> {
    if (!storageKey || !storageKey.startsWith('idb_vid_')) return;
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      tx.objectStore(STORE_VIDEOS).delete(storageKey);
    } catch (e) {
      console.warn('Failed to delete video from IndexedDB:', e);
    }
  },
};
