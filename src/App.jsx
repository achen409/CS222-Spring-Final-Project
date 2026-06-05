import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  ListChecks,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  History
} from 'lucide-react';

const DEFAULT_REQUIREMENTS = `Proposal must include:
- Project title
- Abstract
- Motivation and gap
- Project goal
- Method or agent workflow
- Figure or diagram with caption
- Expected results
- Research milestones with timeline estimates
- Evaluation plan
- Risks and mitigation
- Resources or budget
- References, assumptions, or source notes`;

const EMPTY_PROJECT = {
  title: '',
  topic: '',
  problem: '',
  method: '',
  timeline: '',
  evaluation: '',
  resources: '',
  references: '',
  requirements: DEFAULT_REQUIREMENTS
};

const PROJECT_FIELDS = [
  ['problem', 'Problem'],
  ['goal', 'Goal'],
  ['references', 'Relevant Work'],
  ['referenceAttachments', 'References'],
  ['method', 'Method'],
  ['resources', 'Resources'],
  ['timeline', 'Timeline'],
  ['evaluation', 'Evaluation'],
  ['pageLimits', 'Page Limits']
];

const STAGES = [
  ['1', 'Setup', 'Provide a rough idea or configure your default project scope'],
  ['2', 'Refine', 'Step through the foundational research criteria details'],
  ['3', 'Assemble', 'Review your selected settings inside the project state'],
  ['4', 'Draft', 'LLM writes the formatted LaTeX proposal artifact'],
  ['5', 'Review', 'Matrix and evaluation report critique weak spots']
];

const TABS = [
  ['pdf', FileText, 'PDF'],
  ['latex', FileText, 'LaTeX'],
  ['matrix', ClipboardCheck, 'Matrix'],
  ['evaluation', ListChecks, 'Review']
];

const MEMORY_KEY = 'proposal-agent-final-project-memory-v1';

const QUESTIONNAIRE_STEPS = [
  {
    id: 'category',
    field: 'problem',
    title: 'Research Topic',
    prompt: 'Please select the category that best describes your research topic:',
    options: [
      { key: 'A', label: 'Applied Science / Engineering', value: 'Applied Science / Engineering: Developing new technologies, software, algorithms, or physical systems.' },
      { key: 'B', label: 'Social Sciences / Humanities', value: 'Social Sciences / Humanities: Studying human behavior, society, culture, education, or business trends.' },
      { key: 'C', label: 'Theoretical / Pure Science', value: 'Theoretical / Pure Science: Exploring abstract concepts, mathematical proofs, or fundamental scientific principles.' }
    ]
  },
  {
    id: 'goals',
    field: 'goal',
    title: 'Goals',
    prompt: 'What is the primary goal of this research project?',
    options: [
      { key: 'A', label: 'Innovation & Creation', value: 'Innovation & Creation: To design, build, and test a brand-new solution, tool, or framework.' },
      { key: 'B', label: 'Optimization & Improvement', value: 'Optimization & Improvement: To analyze an existing system or process and find ways to make it faster, more efficient, or more accurate.' },
      { key: 'C', label: 'Exploration & Discovery', value: 'Exploration & Discovery: To investigate an unsolved problem or phenomenon to understand how and why it happens.' }
    ]
  },
  {
    id: 'relevantWork',
    field: 'references',
    title: 'Relevant Work',
    prompt: 'How would you like to provide your background literature or relevant work?',
    options: [
      { key: 'A', label: 'Direct URL Links', value: 'Direct URL Links: I will provide web links to specific papers, articles, or digital libraries (e.g., Google Scholar, arXiv).' },
      { key: 'B', label: 'Reference List text', value: 'Reference List text: I will paste a formatted list of citations/text references (e.g., APA, IEEE format).' },
      { key: 'C', label: 'No links yet (AI-Generated)', value: 'No links yet (AI-Generated): I don\'t have links yet; please suggest relevant papers based on my topic.' }
    ]
  },
  {
    id: 'methodology',
    field: 'method',
    title: 'Research Method',
    prompt: 'Please select your primary research methodology:',
    options: [
      { key: 'A', label: 'Quantitative', value: 'Quantitative (Experiments, surveys, statistical data, numbers)' },
      { key: 'B', label: 'Qualitative', value: 'Qualitative (Interviews, case studies, open-ended text, meanings)' },
      { key: 'C', label: 'Mixed Methods', value: 'Mixed Methods (A combination of both numbers and deep context)' }
    ]
  },
  {
    id: 'data',
    field: 'resources',
    title: 'Data',
    prompt: 'What type of data or resources will your research rely on?',
    options: [
      { key: 'A', label: 'Public Dataset / Open-Source', value: 'Public Dataset / Open-Source: I am using existing, publicly available data (e.g., Kaggle, government databases) and will provide the links.' },
      { key: 'B', label: 'Proprietary / Self-Collected Data', value: 'Proprietary / Self-Collected Data: I am gathering my own data via surveys, experiments, or private company data (no public links available).' },
      { key: 'C', label: 'Simulated / Synthetic Data', value: 'Simulated / Synthetic Data: I will be generating artificial data or running code simulations to test my hypothesis.' }
    ]
  },
  {
    id: 'timeline',
    field: 'timeline',
    title: 'Timeline (Milestones)',
    prompt: 'What is the expected scope and timeline for your research milestones?',
    options: [
      { key: 'A', label: 'Short-term (1-3 months)', value: 'Short-term (1-3 months): Rapid prototyping, quick data collection, and immediate analysis.' },
      { key: 'B', label: 'Medium-term (3-6 months)', value: 'Medium-term (3-6 months): Standard academic semester timeline with distinct phases for literature review, testing, and writing.' },
      { key: 'C', label: 'Long-term (6+ months)', value: 'Long-term (6+ months): Extensive, multi-phase project requiring deep data collection, iterative testing, and prolonged analysis.' }
    ]
  },
  {
    id: 'contributions',
    field: 'evaluation',
    title: 'Contributions',
    prompt: 'What is the main contribution your research will make?',
    options: [
      { key: 'A', label: 'Practical Contribution', value: 'Practical Contribution: Creating a tangible tool, software, or methodology that people can directly use to solve a real-world problem.' },
      { key: 'B', label: 'Theoretical Contribution', value: 'Theoretical Contribution: Adding new knowledge, expanding an existing theory, or filling a gap in current academic literature.' },
      { key: 'C', label: 'Policy / Decision-Making Contribution', value: 'Policy / Decision-Making Contribution: Providing recommendations, insights, or data to help guide industry standards or government policies.' }
    ]
  },
  {
    id: 'pageLimits',
    field: 'pageLimits',
    title: 'Page Limits',
    prompt: 'Choose the target layout length profile constraint for this draft:',
    options: [
      { key: 'A', label: 'Short', value: 'Max 2 pages total. Keep sections highly compressed and succinct.' },
      { key: 'B', label: 'Standard', value: 'Target 4 pages. Full methodology breakdowns and comprehensive checklists.' },
      { key: 'C', label: 'Long', value: 'Unrestricted deep layout structure formatting allowed.' }
    ]
  }
];

function App() {
  const [topicInput, setTopicInput] = useState('');
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [customNote, setCustomNote] = useState('');
  
  // Revision & History State Variables
  const [revisionNote, setRevisionNote] = useState(''); 
  const [versions, setVersions] = useState([]); 
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  const [pdfUrl, setPdfUrl] = useState('');
  const [runLog, setRunLog] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pdf');
  const [memorySavedAt, setMemorySavedAt] = useState('');
  const [memoryReady, setMemoryReady] = useState(false);

  // Computes the active artifact safely from the state history array tracking indexes
  const result = useMemo(() => {
    return versions[currentVersionIndex] || null;
  }, [versions, currentVersionIndex]);

  const matrixStats = useMemo(() => {
    const rows = result?.complianceMatrix || [];
    const covered = rows.filter((row) => /^covered$/i.test(row.status)).length;
    return { covered, total: rows.length };
  }, [result]);

  const acceptedCount = PROJECT_FIELDS.filter(([field]) => Boolean(project[field])).length;
  const currentStep = QUESTIONNAIRE_STEPS[currentStepIndex] || null;

  useEffect(() => {
    loadSavedMemory({ silent: true });
    setMemoryReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Synchronizes the PDF preview frames dynamically when the active user version selection switches
  useEffect(() => {
    async function triggerPdfSync() {
      if (result?.proposalLatex) {
        try {
          const nextPdfUrl = await exportPdfUrl(result.proposalLatex, project.title || 'proposal');
          updatePdfUrl(nextPdfUrl);
        } catch {
          updatePdfUrl('');
        }
      } else {
        updatePdfUrl('');
      }
    }
    triggerPdfSync();
  }, [result]);

  useEffect(() => {
    if (!memoryReady) return;
    if (!topicInput && !result) return;
    saveMemory({ silent: true });
  }, [memoryReady, topicInput, project, currentStepIndex, selections, versions, currentVersionIndex, runLog, activeTab]);

  async function startAgent() {
    return startAgentForTopic(topicInput);
  }

  async function startSampleAgent() {
    const sampleTopic = 'Citation-grounded agent for literature review workflows';
    setTopicInput(sampleTopic);
    return startAgentForTopic(sampleTopic);
  }

  async function startAgentForTopic(nextTopic) {
    setStatus('starting');
    setError('');
    clearArtifacts();

    try {
      const data = await postJson('/api/agent/start', {
        topic: nextTopic,
        requirements: DEFAULT_REQUIREMENTS
      });

      setProject({ ...EMPTY_PROJECT, ...data.project });
      setCurrentStepIndex(0);
      setSelections({});
      setRunLog([
        logEntry('Extract', data.runMessage || 'Initialized proposal requirements.'),
        logEntry('Refine', 'Please cycle through the research strategy config choices.')
      ]);
      setCustomNote('');
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  function handleSelectOption(step, option) {
    const nextSelections = { ...selections, [step.id]: option.key };
    setSelections(nextSelections);

    const targetField = step.field;
    setProject((current) => ({
      ...current,
      [targetField]: `${step.title}: ${option.value}`,
      topic: current.topic || current.title || topicInput
    }));

    setRunLog((current) => [
      ...current,
      logEntry('Config', `Selected Option [${option.key}] for ${step.title}`)
    ]);

    if (currentStepIndex < QUESTIONNAIRE_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }

  async function submitCustomNote() {
    const trimmed = customNote.trim();
    if (!trimmed) return;

    setStatus('answering');
    setError('');

    try {
      const data = await postJson('/api/agent/answer', {
        project,
        question: {
          field: currentStep?.field || 'method',
          question: 'Integrate this user text note into the configuration logic.',
          reason: 'User explicitly supplied a manual customization note.',
          priority: 'Medium'
        },
        answer: trimmed,
        requirements: DEFAULT_REQUIREMENTS
      });

      setProject({ ...EMPTY_PROJECT, ...data.project });
      setRunLog((current) => [
        ...current,
        logEntry('Update', data.runMessage || 'Integrated custom text updates into state data.')
      ]);
      setCustomNote('');
      clearArtifacts();
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  async function generateProposal() {
    setStatus('drafting');
    setError('');

    try {
      const data = await postJson('/api/proposal', {
        ...project,
        topic: project.topic || project.title || topicInput,
        requirements: DEFAULT_REQUIREMENTS
      });

      const nextVersions = [...versions, data];
      setVersions(nextVersions);
      setCurrentVersionIndex(nextVersions.length - 1);
      setActiveTab('pdf');
      
      setRunLog((current) => [
        ...current,
        logEntry('Draft', `Generated initial proposal template version v${nextVersions.length} via context schema structure.`)
      ]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  // NEW: Executes revision pipelines by pushing current output artifacts + feedback parameters
  async function submitRevision() {
    const trimmedComments = revisionNote.trim();
    if (!trimmedComments || !result) return;

    setStatus('drafting');
    setError('');

    try {
      const data = await postJson('/api/proposal/revision', {
        ...project,
        topic: project.topic || project.title || topicInput,
        currentLatex: result.proposalLatex,
        revisionComments: trimmedComments,
        requirements: DEFAULT_REQUIREMENTS
      });

      const nextVersions = [...versions, data];
      setVersions(nextVersions);
      setCurrentVersionIndex(nextVersions.length - 1);
      setRevisionNote(''); // clear revision note text on completion
      setActiveTab('pdf');

      setRunLog((current) => [
        ...current,
        logEntry('Revision', `Successfully engineered revised version v${nextVersions.length} implementation.`)
      ]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  function updateProjectField(field, value) {
    setProject((current) => ({
      ...current,
      [field]: value,
      topic: current.topic || current.title || topicInput
    }));
    clearArtifacts();
  }

  function clearArtifacts() {
    setVersions([]);
    setCurrentVersionIndex(-1);
    updatePdfUrl('');
  }

  function updatePdfUrl(nextUrl) {
    setPdfUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextUrl;
    });
  }

  function reset() {
    setTopicInput('');
    setProject(EMPTY_PROJECT);
    setCurrentStepIndex(0);
    setSelections({});
    setCustomNote('');
    setRevisionNote('');
    clearArtifacts();
    setRunLog([]);
    setError('');
    setActiveTab('pdf');
  }

  function downloadLatex() {
    const proposal = result?.proposalLatex || '';
    const blob = new Blob([proposal], { type: 'text/x-tex;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `proposal-v${currentVersionIndex + 1}.tex`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function downloadPdf() {
    if (!result?.proposalLatex) return;

    setStatus('exporting');
    setError('');

    try {
      const href = pdfUrl || (await exportPdfUrl(result.proposalLatex, project.title || 'proposal'));
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `proposal-v${currentVersionIndex + 1}.pdf`;
      anchor.click();
      if (!pdfUrl) URL.revokeObjectURL(href);
      setRunLog((current) => [...current, logEntry('Export', `Downloaded PDF configuration version version v${currentVersionIndex + 1}.`)]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  function saveMemory({ silent = false } = {}) {
    const snapshot = {
      savedAt: new Date().toISOString(),
      topicInput,
      project,
      currentStepIndex,
      selections,
      versions: versions.map(compactResult),
      currentVersionIndex,
      runLog,
      activeTab
    };

    localStorage.setItem(MEMORY_KEY, JSON.stringify(snapshot));
    setMemorySavedAt(snapshot.savedAt);

    if (!silent) {
      setRunLog((current) => [...current, logEntry('Memory', 'Saved workspace cache memory.')]);
    }
  }

  async function loadSavedMemory({ silent = false } = {}) {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) {
      if (!silent) setError('No saved memory session state discovered.');
      return;
    }

    try {
      const snapshot = JSON.parse(raw);
      setTopicInput(snapshot.topicInput || '');
      setProject({ ...EMPTY_PROJECT, ...(snapshot.project || {}) });
      setCurrentStepIndex(Number(snapshot.currentStepIndex || 0));
      setSelections(snapshot.selections || {});
      setVersions(Array.isArray(snapshot.versions) ? snapshot.versions : []);
      setCurrentVersionIndex(typeof snapshot.currentVersionIndex === 'number' ? snapshot.currentVersionIndex : -1);
      setRunLog(Array.isArray(snapshot.runLog) ? snapshot.runLog : []);
      setActiveTab(snapshot.activeTab || 'pdf');
      setMemorySavedAt(snapshot.savedAt || '');
      setError('');

      if (!silent) {
        setRunLog((current) => [...current, logEntry('Memory', 'Reloaded active snapshot state memory.')]);
      }
    } catch {
      setError('Saved memory is unreadable.');
    }
  }

  function clearSavedMemory() {
    localStorage.removeItem(MEMORY_KEY);
    setMemorySavedAt('');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Research Proposal Agent</h1>
        <span className="status-pill">
          <Sparkles size={16} aria-hidden="true" />
          {result?.mode || (topicInput ? 'structuring' : 'ready')}
        </span>
      </header>

      <section className="workspace single-pane">
        <section className="workflow-artifact">
          <div className="topic-launch">
            <label htmlFor="project-topic">
              Rough Idea
              <input
                id="project-topic"
                value={topicInput}
                onChange={(event) => setTopicInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') startAgent();
                }}
                placeholder="Example: Agent for citation-grounded literature review"
              />
            </label>
            <div className="actions framework-actions">
              <button className="primary" disabled={!topicInput.trim() || status !== 'idle'} onClick={startAgent} type="button">
                {status === 'starting' ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                Structure Idea
              </button>
              <button className="secondary" disabled={status !== 'idle'} onClick={startSampleAgent} type="button">
                <Sparkles size={18} aria-hidden="true" />
                Sample
              </button>
              <button className="secondary icon-button" onClick={reset} type="button" aria-label="Reset">
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="memory-bar">
            <div>
              <strong>Memory Workspace Cache</strong>
              <span>{memorySavedAt ? `Saved ${formatSavedAt(memorySavedAt)}` : 'No local workspace updates matching history data found.'}</span>
            </div>
            <div className="memory-actions">
              <button className="secondary" type="button" onClick={() => saveMemory()}>
                Save
              </button>
              <button className="secondary" type="button" onClick={() => loadSavedMemory()}>
                Reload
              </button>
              <button className="secondary" type="button" onClick={clearSavedMemory}>
                Clear
              </button>
            </div>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}

          <div className="workflow-grid" aria-label="Workflow stages">
            {STAGES.map(([number, title, description], index) => (
              <article className="stage-card" key={title}>
                <div className="stage-topline">
                  <span className="stage-number">{number}</span>
                  <span className={`stage-status ${stageStatus(index, project, result)}`}>
                    {stageLabel(index, project, result)}
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>

          <div className="workspace-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <section className="workspace-panel options-panel">
              <PanelHeader title="Research Strategy Guide" meta={`Step ${currentStepIndex + 1} of ${QUESTIONNAIRE_STEPS.length}`} />
              
              {currentStep ? (
                <div className="decision-deck">
                  <div className="deck-progress">
                    <span>Progress Frame: {currentStep.title}</span>
                    <strong>{Object.keys(selections).length} Fields Selected</strong>
                  </div>
                  
                  <article className="decision-card active-card">
                    <h3 style={{ color: '#2f6f62', fontWeight: 800 }}>{currentStep.title}</h3>
                    <p style={{ fontWeight: 600, fontSize: '1.02rem' }}>{currentStep.prompt}</p>
                    
                    <div className="option-stack">
                      {currentStep.options.map((option) => {
                        const isSelected = selections[currentStep.id] === option.key;
                        return (
                          <button
                            className="option-button"
                            key={option.key}
                            type="button"
                            onClick={() => handleSelectOption(currentStep, option)}
                            style={isSelected ? { borderColor: '#2f6f62', background: '#edf8f4' } : {}}
                          >
                            <strong>Option {option.key}: {option.label}</strong>
                            <span>{option.value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <div className="deck-nav">
                    <button
                      className="secondary"
                      type="button"
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex((current) => Math.max(current - 1, 0))}
                    >
                      Previous
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={currentStepIndex >= QUESTIONNAIRE_STEPS.length - 1}
                      onClick={() => setCurrentStepIndex((current) => Math.min(current + 1, QUESTIONNAIRE_STEPS.length - 1))}
                    >
                      Next
                    </button>
                  </div>

                  <div className="deck-strip" aria-label="Strategy option milestones progress tracks">
                    {QUESTIONNAIRE_STEPS.map((step, idx) => (
                      <button
                        key={step.id}
                        className={[
                          'deck-dot',
                          idx === currentStepIndex ? 'current' : '',
                          selections[step.id] ? 'done' : ''
                        ].join(' ')}
                        type="button"
                        aria-label={`Jump to structural requirement choice segment step ${step.title}`}
                        onClick={() => setCurrentStepIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState text="Supply an initial proposal theme scope above to unpack questions." compact />
              )}

              <section className="custom-note">
                <h3>Other Notes</h3>
                <textarea
                  value={customNote}
                  onChange={(event) => setCustomNote(event.target.value)}
                  placeholder="Add other notes for your research proposal here"
                />
                <button className="primary" disabled={!customNote.trim() || status !== 'idle'} onClick={submitCustomNote} type="button">
                  {status === 'answering' ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                  Inject Custom Constraints
                </button>
              </section>
            </section>

            <section className="workspace-panel state-panel">
              <PanelHeader title="Proposal Parameters" meta={`${acceptedCount}/${PROJECT_FIELDS.length} fields filled`} />
              <label>
                Project Title
                <input value={project.title} onChange={(event) => updateProjectField('title', event.target.value)} placeholder="Provide your primary project working title structure parameters..." />
              </label>
              {PROJECT_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <textarea value={project[field] || ''} onChange={(event) => updateProjectField(field, event.target.value)} />
                </label>
              ))}
              <button className="primary" disabled={!project.title || status !== 'idle'} onClick={generateProposal} type="button" style={{ marginTop: '8px', minHeight: '44px' }}>
                {status === 'drafting' ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                Generate Proposal
              </button>
            </section>
          </div>

          <div className="workflow-columns">
            <section className="workflow-panel">
              <h2>Activity Log Stack</h2>
              {runLog.length ? (
                <ol className="run-log">
                  {runLog.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.stage}</span>
                      <p>{entry.message}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState text="Operations timeline stream activates when actions execute." compact />
              )}
            </section>

            <section className="workflow-panel artifacts-panel">
              <div className="artifact-toolbar" style={{ flexWrap: 'wrap', gap: '8px', display: 'flex', alignItems: 'center' }}>
                <nav className="tabs" aria-label="Generated workspace output assets panels">
                  {TABS.map(([id, Icon, label]) => (
                    <button
                      key={id}
                      className={activeTab === id ? 'tab active' : 'tab'}
                      type="button"
                      onClick={() => setActiveTab(id)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </nav>

                {/* VERSION SELECTOR COMBOBOX */}
                {versions.length > 0 && (
                  <div className="version-selector" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                    <History size={16} style={{ color: '#4a5568' }} />
                    <select 
                      value={currentVersionIndex} 
                      onChange={(e) => setCurrentVersionIndex(Number(e.target.value))}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {versions.map((_, idx) => (
                        <option key={idx} value={idx}>
                          Version {idx + 1} {idx === versions.length - 1 ? '(Latest)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button className="secondary" type="button" disabled={!result?.proposalLatex} onClick={downloadLatex} style={{ marginLeft: versions.length === 0 ? 'auto' : '0' }}>
                  <Download size={17} aria-hidden="true" />
                  LaTeX
                </button>
                <button
                  className="primary"
                  type="button"
                  disabled={!result?.proposalLatex || status !== 'idle'}
                  onClick={downloadPdf}
                >
                  {status === 'exporting' ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
                  PDF Document
                </button>
              </div>

              <div className="artifact-summary">
                <div>
                  <span>Rubric Requirements Covered</span>
                  <strong>{matrixStats.total ? `${matrixStats.covered}/${matrixStats.total}` : '0/0'}</strong>
                </div>
                <div>
                  <span>Populated Input Profiles</span>
                  <strong>{acceptedCount}/{PROJECT_FIELDS.length}</strong>
                </div>
                <div>
                  <span>Active Model Engine</span>
                  <strong>{result?.provider || 'Standby Fallback Mode'}</strong>
                </div>
              </div>

              {renderArtifact(activeTab, result, pdfUrl)}

              {/* REVISION SUBMISSION BOX MODULE */}
              {result && (
                <section className="custom-note revision-module" style={{ marginTop: '24px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1a202c', fontWeight: '700' }}>
                      Propose Changes to Version {currentVersionIndex + 1}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                      Submitting generates Version {versions.length + 1}
                    </span>
                  </div>
                  <textarea
                    value={revisionNote}
                    onChange={(event) => setRevisionNote(event.target.value)}
                    placeholder="Provide comments or explicit revisions to apply to this draft version (e.g. 'Shorten the abstract' or 'Add a section detail describing risk mitigations')..."
                    style={{ minHeight: '90px', width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <button 
                    className="primary" 
                    disabled={!revisionNote.trim() || status !== 'idle'} 
                    onClick={submitRevision} 
                    type="button"
                    style={{ backgroundColor: '#2b6cb0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {status === 'drafting' ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                    Submit Revision Request
                  </button>
                </section>
              )}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Server interaction failed.');
  }

  return data;
}

async function exportPdfUrl(proposalLatex, title) {
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      proposalLatex
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || data.error || 'LaTeX PDF engine compilation failed.');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function renderArtifact(activeTab, result, pdfUrl) {
  if (!result) {
    return <EmptyState text="Compilation target results show up here after running the generator layout framework pipeline." />;
  }

  if (activeTab === 'pdf') {
    return pdfUrl ? (
      <iframe className="pdf-preview" src={pdfUrl} title="Compiled structural proposal artifact PDF stream visualization layout viewer panel" />
    ) : (
      <EmptyState text="The PDF output framework configuration script engine is rendering layout pipelines..." />
    );
  }

  if (activeTab === 'matrix') {
    return (
      <div className="matrix-wrap">
        <table>
          <thead>
            <tr>
              <th>Requirement Metric</th>
              <th>Compliance State Status</th>
              <th>Structural Text Evidence Context</th>
              <th>Corrective Revision Patch Action</th>
            </tr>
          </thead>
          <tbody>
            {(result.complianceMatrix || []).map((row, index) => (
              <tr key={`${row.requirement}-${index}`}>
                <td>{row.requirement}</td>
                <td>
                  <span className={/^covered$/i.test(row.status) ? 'badge covered' : 'badge needs-work'}>{row.status}</span>
                </td>
                <td>{row.evidence}</td>
                <td>{row.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeTab === 'evaluation') {
    return <pre>{result.evaluationReport}</pre>;
  }

  return <pre className="proposal-output">{result.proposalLatex}</pre>;
}

function PanelHeader({ title, meta }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <span>{meta}</span>
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      <FileText size={compact ? 24 : 32} aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function stageStatus(index, project, result) {
  if (index === 0 && (project.title || project.topic)) return 'status-complete';
  if (index === 1 && PROJECT_FIELDS.some(([field]) => project[field])) return 'status-complete';
  if (index === 2 && PROJECT_FIELDS.every(([field]) => project[field])) return 'status-complete';
  if (index >= 3 && result) return 'status-complete';
  return 'status-waiting';
}

function stageLabel(index, project, result) {
  if (index === 0 && (project.title || project.topic)) return 'Configured';
  if (index === 1 && PROJECT_FIELDS.some(([field]) => project[field])) return 'Configuring';
  if (index === 2 && PROJECT_FIELDS.every(([field]) => project[field])) return 'Assembled';
  if (index >= 3 && result) return 'Render Complete';
  return 'In Queue';
}

function logEntry(stage, message) {
  return {
    id: `${stage}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stage,
    message
  };
}

function readError(error) {
  return error instanceof Error ? error.message : String(error);
}

function compactResult(result) {
  if (!result) return null;
  return {
    mode: result.mode,
    provider: result.provider,
    proposalLatex: result.proposalLatex,
    complianceMatrix: result.complianceMatrix,
    evaluationReport: result.evaluationReport,
    questions: result.questions
  };
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'live sync';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default App;