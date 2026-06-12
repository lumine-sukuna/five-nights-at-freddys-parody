import { useState } from 'react';
import { Copy, Check, FileCode, Cpu, Lightbulb, Play, Layers } from 'lucide-react';

interface ScriptItem {
  id: string;
  name: string;
  icon: any;
  description: string;
  code: string;
}

export default function UnityScriptsViewer() {
  const [activeTab, setActiveTab] = useState<string>('GameManager');
  const [copied, setCopied] = useState<boolean>(false);

  const scripts: ScriptItem[] = [
    {
      id: 'GameManager',
      name: 'GameManager.cs',
      icon: Cpu,
      description: 'Головний менеджер ігрового процесу: відлік часу ночі, швидкість аніматроніків, стан гравця та логіка виграшу/програшу.',
      code: `using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Game States")]
    public int currentNight = 1;
    public float timePerHour = 50f; // секунд на одну ігрову годину (разом 5 хвилин на ніч)
    public int currentHour = 12; // Починаємо з 12 AM
    public bool isGameOver = false;
    public bool isPowerOut = false;

    [Header("UI Reference")]
    public Text clockText;
    public Text nightText;
    public GameObject victoryScreen;
    public GameObject gameOverScreen;
    public AudioSource soundEffectsSource;
    public AudioClip clockChimeClip;
    public AudioClip jumpscareClip;

    private float timer;

    private void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    private void Start()
    {
        timer = timePerHour;
        UpdateClockUI();
        if (nightText != null) nightText.text = "Night " + currentNight;
        
        // Ініціалізація рівнів AI для поточної ночі
        ConfigureAnimatronicDifficulties(currentNight);
    }

    private void Update()
    {
        if (isGameOver || isPowerOut) return;

        timer -= Time.deltaTime;
        if (timer <= 0)
        {
            AdvanceHour();
        }
    }

    private void AdvanceHour()
    {
        timer = timePerHour;
        if (currentHour == 12) currentHour = 1;
        else currentHour++;

        if (currentHour == 6)
        {
            TriggerVictory();
        }
        else
        {
            UpdateClockUI();
        }
    }

    private void UpdateClockUI()
    {
        if (clockText != null)
        {
            clockText.text = currentHour + " AM";
        }
    }

    public void TriggerVictory()
    {
        isGameOver = true;
        if (clockText != null) clockText.text = "6:00 AM";
        
        // Збереження прогресу ночі в PlayerPrefs
        int currentUnlocked = PlayerPrefs.GetInt("UnlockedNight", 1);
        if (currentNight == currentUnlocked && currentUnlocked < 6)
        {
            PlayerPrefs.SetInt("UnlockedNight", currentUnlocked + 1);
            PlayerPrefs.Save();
        }

        if (victoryScreen != null) victoryScreen.SetActive(true);
        if (soundEffectsSource != null && clockChimeClip != null)
        {
            soundEffectsSource.PlayOneShot(clockChimeClip);
        }
        
        Debug.Log("Вітаємо! Ви вижили до 6 ранку!");
    }

    public void TriggerJumpscare(string animatronicName)
    {
        if (isGameOver) return;
        isGameOver = true;

        Debug.LogError("Гравець був знищений аніматроніком: " + animatronicName);
        
        if (soundEffectsSource != null && jumpscareClip != null)
        {
            soundEffectsSource.PlayOneShot(jumpscareClip);
        }

        if (gameOverScreen != null)
        {
            gameOverScreen.SetActive(true);
            Text killerText = gameOverScreen.GetComponentInChildren<Text>();
            if (killerText != null) killerText.text = "Вас упіймав " + animatronicName;
        }
    }

    private void ConfigureAnimatronicDifficulties(int night)
    {
        // Пошук усіх AI об'єктів у сцені та налаштування складності
        AnimatronicAI[] robots = FindObjectsOfType<AnimatronicAI>();
        foreach (var robot in robots)
        {
            robot.SetupDifficultyForNight(night);
        }
    }

    public void RestartGame()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
}`
    },
    {
      id: 'PowerSystem',
      name: 'PowerSystem.cs',
      icon: Lightbulb,
      description: 'Керує запасом електроенергії (0-100%). Розраховує навантаження від відкритих камер, освітлення та дверей.',
      code: `using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class PowerSystem : MonoBehaviour
{
    public static PowerSystem Instance { get; private set; }

    [Header("Energy Stats")]
    public float powerRemaining = 100f;
    public float baseDrainRate = 0.1f; // Відсоток за секунду
    public Text powerText;
    public RectTransform powerBar;
    public GameObject usagePipsIndicator; // Візуальні позначки навантаження

    [Header("System References")]
    public DoorController leftDoor;
    public DoorController rightDoor;
    public Light leftDoorLight;
    public Light rightDoorLight;
    public GameObject cctvMonitor;

    private void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    private void Update()
    {
        if (GameManager.Instance.isGameOver || GameManager.Instance.isPowerOut) return;

        // Розрахунок поточного навантаження
        int activeSpikes = 1; // Базове навантаження (будівля)
        if (leftDoor != null && leftDoor.isClosed) activeSpikes++;
        if (rightDoor != null && rightDoor.isClosed) activeSpikes++;
        if (leftDoorLight != null && leftDoorLight.enabled) activeSpikes++;
        if (rightDoorLight != null && rightDoorLight.enabled) activeSpikes++;
        if (cctvMonitor != null && cctvMonitor.activeSelf) activeSpikes++;

        // Розраховуємо швидкість споживання
        float totalDrain = baseDrainRate * activeSpikes * Time.deltaTime;
        powerRemaining -= totalDrain;

        if (powerRemaining <= 0)
        {
            powerRemaining = 0;
            TriggerPowerOutage();
        }

        UpdatePowerUI(activeSpikes);
    }

    private void UpdatePowerUI(int load)
    {
        if (powerText != null)
        {
            powerText.text = "Power: " + Mathf.RoundToInt(powerRemaining) + "%";
        }

        if (powerBar != null)
        {
            powerBar.localScale = new Vector3(powerRemaining / 100f, 1f, 1f);
        }
    }

    private void TriggerPowerOutage()
    {
        GameManager.Instance.isPowerOut = true;
        Debug.LogWarning("ЕНЕРГІЯ ПОВНІСТЮ ВИЧЕРПАНА!");

        // 1. Вимикаємо всі освітлювальні прилади в офісі
        Light[] allLights = FindObjectsOfType<Light>();
        foreach (Light l in allLights)
        {
            l.enabled = false;
        }

        // 2. Насильно відкриваємо ліві та праві двері (магнітні замки розмагнітились)
        if (leftDoor != null) leftDoor.ForceOpen();
        if (rightDoor != null) rightDoor.ForceOpen();

        // 3. Вимикаємо планшет камери
        if (cctvMonitor != null) cctvMonitor.SetActive(false);

        // 4. Починаємо послідовність атаки при відсутності енергії
        StartCoroutine(PowerOutageSequence());
    }

    private IEnumerator PowerOutageSequence()
    {
        yield return new WaitForSeconds(3.0f);
        // Грати зловісну колискову з темряви
        Debug.Log("Грає таємнича музика з коридору...");

        // Випадкова затримка нападу від 5 до 15 секунд
        yield return new WaitForSeconds(Random.Range(5f, 15f));

        if (!GameManager.Instance.isGameOver)
        {
            // Скрімер у темряві!
            GameManager.Instance.TriggerJumpscare("Blinky (Bear - PowerOut)");
        }
    }
}`
    },
    {
      id: 'AnimatronicAI',
      name: 'AnimatronicAI.cs',
      icon: Play,
      description: 'Штучний інтелект ворогів. Визначає таймінги пересування по кімнатах, перевіряє стан дверей офісу при атаці та показує скрімер.',
      code: `using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class AnimatronicAI : MonoBehaviour
{
    public string robotName = "Name";
    public string startWaypoint = "STAGE";
    public List<string> routeWaypoints; // Список логічних імен навігаційних точок
    
    [Header("AI Settings")]
    public int aiLevel = 5; // Складність від 0 до 20
    public float movementInterval = 7f; // Кожні Х секунд аніматронік намагається зробити крок
    public DoorController targetDoor; [Header("Attack Target Door")]

    private int currentRouteIndex = 0;
    private string currentPosition;
    private float movementTimer;

    private void Start()
    {
        currentPosition = startWaypoint;
        movementTimer = movementInterval;
    }

    public void SetupDifficultyForNight(int night)
    {
        // Залежність сили AI моделей від поточної ночі
        if (robotName == "Blinky") aiLevel = Mathf.Min(20, night * 3);
        else if (robotName == "Ziggy") aiLevel = Mathf.Min(20, night * 4 - 2);
        else if (robotName == "Sirena") aiLevel = Mathf.Min(20, night * 3 - 1);
        else aiLevel = Mathf.Min(20, night * 2);

        Debug.Log(robotName + " AI налаштовано на рівень: " + aiLevel);
    }

    private void Update()
    {
        if (GameManager.Instance.isGameOver || GameManager.Instance.isPowerOut) return;

        movementTimer -= Time.deltaTime;
        if (movementTimer <= 0)
        {
            movementTimer = movementInterval;
            TryToMove();
        }
    }

    private void TryToMove()
    {
        // Кидаємо кубик 1-20. Якщо випало значення <= aiLevel, то робот рухається
        int roll = Random.Range(1, 21);
        if (roll <= aiLevel)
        {
            ExecuteMove();
        }
    }

    private void ExecuteMove()
    {
        if (currentPosition == "OFFICE")
        {
            // Вже готується напасти
            CheckAttackResult();
            return;
        }

        if (currentRouteIndex < routeWaypoints.Count - 1)
        {
            currentRouteIndex++;
            currentPosition = routeWaypoints[currentRouteIndex];
            Debug.Log(robotName + " перемістився у кімнату: " + currentPosition);

            // Якщо дійшов до дверей, то переміщаємось до офісу
            if (currentPosition == "DOORWAY")
            {
                currentPosition = "OFFICE";
            }
        }
    }

    private void CheckAttackResult()
    {
        // Перевіряємо, чи закриті двері
        if (targetDoor != null && targetDoor.isClosed)
        {
            // Двері зачинені! Робот б\'ється у двері та повертається на початок маршруту
            Debug.Log(robotName + " зіткнувся із зачиненими дверима. Повернення на Сцену.");
            targetDoor.PlayThumpSound();
            
            // Скидаємо позицію
            currentRouteIndex = 0;
            currentPosition = startWaypoint;
        }
        else
        {
            // Двері відчинені! Гравець програє
            GameManager.Instance.TriggerJumpscare(robotName);
        }
    }
}`
    },
    {
      id: 'DoorController',
      name: 'DoorController.cs',
      icon: Layers,
      description: 'Керує механічними дверима кабінету. Анімує вертикальне ковзання заслінок за допомогою LeanTween або стандартної інтерполяції.',
      code: `using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [Header("Door Properties")]
    public bool isClosed = false;
    public float slideSpeed = 5f;
    public Vector3 openPosition;
    public Vector3 closedPosition;
    public Transform doorMesh; // Ссылка на 3D модель дверей, которая будет двигаться

    [Header("Audio Components")]
    public AudioSource audioSource;
    public AudioClip doorMoveClip;
    public AudioClip wallThumpClip;

    private void Start()
    {
        if (doorMesh != null)
        {
            doorMesh.localPosition = isClosed ? closedPosition : openPosition;
        }
    }

    private void Update()
    {
        if (doorMesh == null) return;

        // Плавна зміна позиції у кадрі
        Vector3 targetPos = isClosed ? closedPosition : openPosition;
        doorMesh.localPosition = Vector3.Lerp(doorMesh.localPosition, targetPos, Time.deltaTime * slideSpeed);
    }

    public void ToggleDoor()
    {
        if (PowerSystem.Instance != null && PowerSystem.Instance.powerRemaining <= 0) return;

        isClosed = !isClosed;

        if (audioSource != null && doorMoveClip != null)
        {
            audioSource.PlayOneShot(doorMoveClip);
        }
    }

    public void ForceOpen()
    {
        isClosed = false;
        if (audioSource != null && doorMoveClip != null)
        {
            audioSource.PlayOneShot(doorMoveClip);
        }
    }

    public void PlayThumpSound()
    {
        if (audioSource != null && wallThumpClip != null)
        {
            audioSource.PlayOneShot(wallThumpClip);
        }
    }
}`
    }
  ];

  const handleCopy = () => {
    const activeScript = scripts.find(s => s.id === activeTab);
    if (!activeScript) return;
    navigator.clipboard.writeText(activeScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeScript = scripts.find(s => s.id === activeTab) || scripts[0];

  return (
    <div id="unity-scripts-explorer" className="w-full bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden text-slate-100 font-sans">
      {/* Tab bar header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-bold tracking-wider text-amber-500 font-mono uppercase">Unity 3D / C# Скрипти Проекту</h2>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Готові до імпорту в Unity 2022+
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 min-h-[480px]">
        {/* Left Side Tab Navigation */}
        <div className="col-span-1 bg-slate-950/50 border-r border-slate-800 p-2 flex flex-col gap-1">
          {scripts.map(s => {
            const IconComponent = s.icon;
            return (
              <button
                key={s.id}
                id={`btn-script-tab-${s.id}`}
                onClick={() => {
                  setActiveTab(s.id);
                  setCopied(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition text-xs font-mono border ${
                  activeTab === s.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-transparent border-transparent hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                }`}
              >
                <IconComponent className="h-4 w-4 shrink-0" />
                <span>{s.name}</span>
              </button>
            );
          })}
          <div className="mt-auto p-2 bg-slate-900/60 rounded border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
            💡 Копіюйте ці скрипти та переносьте їх у папку <code className="text-amber-400">Assets/Scripts/</code> вашого Unity-проекту.
          </div>
        </div>

        {/* Right Side Code View */}
        <div className="col-span-3 flex flex-col bg-slate-900">
          <div className="p-4 bg-slate-950/30 border-b border-slate-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 font-mono text-amber-400">{activeScript.name}</p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">{activeScript.description}</p>
            </div>
            <button
              id="btn-copy-unity-script"
              onClick={handleCopy}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono font-bold text-xs px-3 py-1.5 rounded transition shadow shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Скопійовано!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Копіювати Код</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex-1 p-3 overflow-auto max-h-[420px] font-mono text-[11px] leading-relaxed bg-[#0c0f12]">
            <pre className="text-emerald-400">
              <code>{activeScript.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
