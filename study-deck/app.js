(() => {
  'use strict';

  const DATA = window.QUIZ_DATA;
  const STORAGE_KEY = 'study-deck-progress-v1';
  const SUBJECT_STYLES = {
    constructo: { accent: '#16796f', soft: '#d8ebe5', mark: 'CU' },
    english: { accent: '#db654d', soft: '#f6ddd6', mark: 'EN' },
    quantitative: { accent: '#365c82', soft: '#dfe8f0', mark: 'QR' },
    catedra: { accent: '#a16a24', soft: '#f1e5cf', mark: 'CI' },
    psychology: { accent: '#74579a', soft: '#e9e0f1', mark: 'PS' },
    entrepreneurship: { accent: '#92731f', soft: '#f2e9c9', mark: 'EG' }
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    homeView: $('homeView'), quizView: $('quizView'), resultsView: $('resultsView'),
    subjectGrid: $('subjectGrid'), setupDialog: $('setupDialog'), setupForm: $('setupForm'),
    setupSubjectName: $('setupSubjectName'), topicSelect: $('topicSelect'),
    quickStartButton: $('quickStartButton'), reviewButton: $('reviewButton'), reviewCount: $('reviewCount'),
    masteryPercent: $('masteryPercent'), masteryRing: $('masteryRing'), masteredCount: $('masteredCount'),
    attemptedCount: $('attemptedCount'), bestStreak: $('bestStreak'), progressNote: $('progressNote'),
    totalQuestionCount: $('totalQuestionCount'), subjectCount: $('subjectCount'), brandButton: $('brandButton'), resetButton: $('resetButton'), soundButton: $('soundButton'),
    quitQuizButton: $('quitQuizButton'), quizSubject: $('quizSubject'), quizCounter: $('quizCounter'), currentStreak: $('currentStreak'), quizProgressBar: $('quizProgressBar'),
    questionCard: $('questionCard'), topicLabel: $('topicLabel'), reinforcementLabel: $('reinforcementLabel'), questionNumber: $('questionNumber'), questionText: $('questionText'), answerGrid: $('answerGrid'),
    feedbackPanel: $('feedbackPanel'), feedbackIcon: $('feedbackIcon'), feedbackTitle: $('feedbackTitle'), feedbackText: $('feedbackText'), nextButton: $('nextButton'),
    resultsTitle: $('resultsTitle'), resultsSummary: $('resultsSummary'), resultPercent: $('resultPercent'), resultCorrect: $('resultCorrect'), resultReinforced: $('resultReinforced'), resultsBreakdown: $('resultsBreakdown'), retryMistakesButton: $('retryMistakesButton'), backHomeButton: $('backHomeButton'),
    confirmDialog: $('confirmDialog'), confirmTitle: $('confirmTitle'), confirmText: $('confirmText'), confirmActionButton: $('confirmActionButton')
  };

  let progress = loadProgress();
  let selectedSubject = null;
  let session = null;
  let confirmAction = null;

  function defaultProgress() {
    return { questions: {}, bestStreak: 0, sound: true, lastSubject: null };
  }

  function loadProgress() {
    try {
      return { ...defaultProgress(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return defaultProgress();
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function questionsForSubject(id) {
    return DATA.questions.filter(q => q.subject === id);
  }

  function questionStats(id) {
    return progress.questions[id] || { attempts: 0, correct: 0, wrong: 0, mastery: 0, lastSeen: 0 };
  }

  function weakQuestions(subjectId = null) {
    return DATA.questions.filter(q => {
      if (subjectId && q.subject !== subjectId) return false;
      const s = questionStats(q.id);
      return s.wrong > 0 && s.mastery < 2;
    }).sort((a, b) => {
      const sa = questionStats(a.id), sb = questionStats(b.id);
      return (sb.wrong - sb.correct) - (sa.wrong - sa.correct) || sa.lastSeen - sb.lastSeen;
    });
  }

  function subjectMastery(subjectId) {
    const qs = questionsForSubject(subjectId);
    const mastered = qs.filter(q => questionStats(q.id).mastery >= 2).length;
    return qs.length ? Math.round(mastered / qs.length * 100) : 0;
  }

  function renderHome() {
    const attempted = DATA.questions.filter(q => questionStats(q.id).attempts > 0).length;
    const mastered = DATA.questions.filter(q => questionStats(q.id).mastery >= 2).length;
    const percent = Math.round(mastered / DATA.questions.length * 100);
    const weak = weakQuestions();

    els.masteryPercent.textContent = `${percent}%`;
    els.masteryRing.style.setProperty('--value', percent);
    els.masteredCount.textContent = mastered;
    els.attemptedCount.textContent = attempted;
    els.bestStreak.textContent = progress.bestStreak || 0;
    els.reviewCount.textContent = weak.length;
    els.reviewButton.disabled = weak.length === 0;
    els.totalQuestionCount.textContent = DATA.questions.length;
    if (els.subjectCount) els.subjectCount.textContent = DATA.subjects.length;
    els.progressNote.textContent = attempted === 0
      ? 'Your progress is stored on this device.'
      : mastered < 10 ? 'Keep going — mastery builds through retrieval.'
      : `${mastered} questions now feel familiar.`;
    els.soundButton.classList.toggle('is-muted', !progress.sound);

    els.subjectGrid.innerHTML = DATA.subjects.map(subject => {
      const style = SUBJECT_STYLES[subject.id];
      const mastery = subjectMastery(subject.id);
      const attemptedSubject = questionsForSubject(subject.id).filter(q => questionStats(q.id).attempts > 0).length;
      return `
        <button class="subject-card" type="button" data-subject="${subject.id}" style="--accent:${style.accent};--accent-soft:${style.soft}">
          <span class="subject-icon">${style.mark}</span>
          <h3>${escapeHtml(subject.name)}</h3>
          <p>${escapeHtml(subject.description)}</p>
          <div class="subject-card-footer">
            <div>
              <span>${subject.questionCount} questions · ${subject.topicCount} topics</span>
              <div class="subject-progress"><i style="--progress:${mastery}%"></i><strong>${mastery}%</strong></div>
            </div>
            <span class="subject-arrow" aria-hidden="true">↗</span>
          </div>
          <span class="sr-only">${attemptedSubject} attempted</span>
        </button>`;
    }).join('');

    els.subjectGrid.querySelectorAll('[data-subject]').forEach(button => {
      button.addEventListener('click', () => openSetup(button.dataset.subject));
    });
  }

  function openSetup(subjectId) {
    selectedSubject = DATA.subjects.find(s => s.id === subjectId);
    if (!selectedSubject) return;
    els.setupSubjectName.textContent = selectedSubject.name;
    els.topicSelect.innerHTML = `<option value="all">All topics</option>` + selectedSubject.topics
      .map(topic => `<option value="${escapeAttr(topic)}">${escapeHtml(topic)}</option>`).join('');
    els.setupDialog.showModal();
  }

  function startConfiguredSession() {
    if (!selectedSubject) return;
    const formData = new FormData(els.setupForm);
    const topic = formData.get('topic');
    const mode = formData.get('mode') || 'learn';
    const length = formData.get('length') || '10';
    let pool = questionsForSubject(selectedSubject.id);
    if (topic !== 'all') pool = pool.filter(q => q.topic === topic);
    const count = length === 'all' ? pool.length : Math.min(Number(length), pool.length);
    startSession(shuffle(pool).slice(0, count), { mode, subjectId: selectedSubject.id, label: selectedSubject.name });
  }

  function startMixedSession() {
    const pool = DATA.subjects.flatMap(subject => shuffle(questionsForSubject(subject.id)).slice(0, 3));
    startSession(shuffle(pool).slice(0, 15), { mode: 'learn', subjectId: 'mixed', label: 'Mixed review' });
  }

  function startReviewSession(subjectId = null) {
    const pool = weakQuestions(subjectId).slice(0, 20);
    if (!pool.length) return;
    const label = subjectId ? DATA.subjects.find(s => s.id === subjectId).name : 'Mistake review';
    startSession(shuffle(pool), { mode: 'learn', subjectId: subjectId || 'review', label, reviewOnly: true });
  }

  function startSession(baseQuestions, options) {
    if (!baseQuestions.length) return;
    session = {
      mode: options.mode,
      subjectId: options.subjectId,
      label: options.label,
      reviewOnly: Boolean(options.reviewOnly),
      plan: baseQuestions.map(q => ({ question: q, retry: false, generation: 0 })),
      baseIds: new Set(baseQuestions.map(q => q.id)),
      cursor: 0,
      answered: false,
      selectedPresentationIndex: null,
      presentation: null,
      firstTryCorrect: 0,
      baseAnswered: 0,
      reinforced: 0,
      currentStreak: 0,
      missedIds: new Set(),
      topicResults: {},
      examAnswers: [],
      startedAt: Date.now()
    };
    progress.lastSubject = options.subjectId;
    saveProgress();
    switchView('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const item = session.plan[session.cursor];
    if (!item) return finishSession();
    const q = item.question;
    session.answered = false;
    session.selectedPresentationIndex = null;
    session.presentation = makePresentation(q);

    els.questionCard.classList.remove('is-wrong');
    els.questionCard.classList.add('is-changing');
    setTimeout(() => els.questionCard.classList.remove('is-changing'), 470);
    els.quizSubject.textContent = session.label;
    els.quizCounter.textContent = `${session.cursor + 1} / ${session.plan.length}`;
    els.currentStreak.textContent = session.currentStreak;
    els.quizProgressBar.style.width = `${Math.round(session.cursor / session.plan.length * 100)}%`;
    els.topicLabel.textContent = q.topic;
    els.topicLabel.title = q.topic;
    els.reinforcementLabel.classList.toggle('is-visible', item.retry);
    els.questionNumber.textContent = item.retry ? `Retry · ${q.id.split('-').pop()}` : `Question ${session.baseAnswered + 1}`;
    els.questionText.textContent = q.question;
    els.feedbackPanel.className = 'feedback-panel';
    els.feedbackTitle.textContent = '';
    els.feedbackText.textContent = '';
    els.nextButton.disabled = true;
    els.nextButton.textContent = 'Continue';
    els.nextButton.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>');

    els.answerGrid.innerHTML = session.presentation.options.map((option, index) => `
      <button class="answer-button" type="button" data-index="${index}">
        <span class="answer-letter">${index + 1}</span>
        <span>${escapeHtml(option.text)}</span>
      </button>`).join('');
    els.answerGrid.querySelectorAll('.answer-button').forEach(button => {
      button.addEventListener('click', () => chooseAnswer(Number(button.dataset.index)));
    });
    els.questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function makePresentation(question) {
    const options = shuffle(question.options.map((text, originalIndex) => ({ text, originalIndex })));
    return { options, correctPresentationIndex: options.findIndex(o => o.originalIndex === question.answerIndex) };
  }

  function chooseAnswer(presentationIndex) {
    if (!session || session.answered) return;
    session.answered = true;
    session.selectedPresentationIndex = presentationIndex;
    const item = session.plan[session.cursor];
    const q = item.question;
    const isCorrect = presentationIndex === session.presentation.correctPresentationIndex;
    const buttons = [...els.answerGrid.querySelectorAll('.answer-button')];
    buttons.forEach((button, index) => {
      button.disabled = true;
      button.classList.toggle('is-selected', index === presentationIndex);
    });

    if (session.mode === 'exam') {
      buttons[presentationIndex].classList.add('is-selected');
      session.examAnswers.push({ item, isCorrect, selected: session.presentation.options[presentationIndex].text });
      recordTopicResult(q.topic, isCorrect, item.retry);
      updatePersistentStats(q, isCorrect);
      if (!item.retry) {
        session.baseAnswered++;
        if (isCorrect) session.firstTryCorrect++;
        else session.missedIds.add(q.id);
      }
      session.currentStreak = isCorrect ? session.currentStreak + 1 : 0;
      progress.bestStreak = Math.max(progress.bestStreak || 0, session.currentStreak);
      els.currentStreak.textContent = session.currentStreak;
      els.nextButton.disabled = false;
      if (session.cursor === session.plan.length - 1) setNextLabel('Finish');
      return;
    }

    buttons[session.presentation.correctPresentationIndex].classList.add('is-correct');
    if (!isCorrect) {
      buttons[presentationIndex].classList.add('is-wrong');
      els.questionCard.classList.add('is-wrong');
      setTimeout(() => els.questionCard.classList.remove('is-wrong'), 420);
    }

    showFeedback(isCorrect, q.explanation, item.retry);
    recordTopicResult(q.topic, isCorrect, item.retry);
    updatePersistentStats(q, isCorrect);

    if (!item.retry) {
      session.baseAnswered++;
      if (isCorrect) session.firstTryCorrect++;
      else session.missedIds.add(q.id);
    } else if (isCorrect) {
      session.reinforced++;
      session.missedIds.delete(q.id);
    }

    session.currentStreak = isCorrect ? session.currentStreak + 1 : 0;
    progress.bestStreak = Math.max(progress.bestStreak || 0, session.currentStreak);
    els.currentStreak.textContent = session.currentStreak;

    if (!isCorrect) scheduleReinforcement(item);
    playTone(isCorrect);
    saveProgress();
    els.nextButton.disabled = false;
    if (session.cursor === session.plan.length - 1 && isCorrect) setNextLabel('Finish');
  }

  function setNextLabel(text) {
    els.nextButton.textContent = text;
    els.nextButton.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>');
  }

  function scheduleReinforcement(item) {
    const distance = item.retry ? 2 : 3;
    const insertAt = Math.min(session.cursor + distance + 1, session.plan.length);
    const alreadyScheduled = session.plan.slice(session.cursor + 1).some(entry => entry.retry && entry.question.id === item.question.id);
    if (!alreadyScheduled) {
      session.plan.splice(insertAt, 0, { question: item.question, retry: true, generation: item.generation + 1 });
    }
  }

  function showFeedback(isCorrect, explanation, retry) {
    els.feedbackPanel.className = `feedback-panel is-visible ${isCorrect ? 'is-correct' : 'is-wrong'}`;
    els.feedbackIcon.textContent = isCorrect ? '✓' : '×';
    if (isCorrect) {
      els.feedbackTitle.textContent = retry ? 'That one is reinforced.' : 'Correct.';
      els.feedbackText.textContent = retry ? 'The question leaves your retry queue.' : explanation;
    } else {
      els.feedbackTitle.textContent = 'Not quite — it will return shortly.';
      els.feedbackText.textContent = explanation;
    }
  }

  function updatePersistentStats(q, isCorrect) {
    const s = questionStats(q.id);
    s.attempts += 1;
    s.lastSeen = Date.now();
    if (isCorrect) {
      s.correct += 1;
      s.mastery = Math.min(3, s.mastery + 1);
    } else {
      s.wrong += 1;
      s.mastery = Math.max(0, s.mastery - 1);
    }
    progress.questions[q.id] = s;
    saveProgress();
  }

  function recordTopicResult(topic, isCorrect, retry) {
    if (retry) return;
    const row = session.topicResults[topic] || { correct: 0, total: 0 };
    row.total += 1;
    if (isCorrect) row.correct += 1;
    session.topicResults[topic] = row;
  }

  function nextQuestion() {
    if (!session || !session.answered) return;
    session.cursor += 1;
    if (session.cursor >= session.plan.length) finishSession();
    else renderQuestion();
  }

  function finishSession() {
    const baseTotal = session.baseIds.size;
    const percent = Math.round(session.firstTryCorrect / baseTotal * 100);
    const remainingMistakes = [...session.missedIds];
    els.quizProgressBar.style.width = '100%';
    els.resultPercent.textContent = `${percent}%`;
    els.resultCorrect.textContent = `${session.firstTryCorrect}/${baseTotal}`;
    els.resultReinforced.textContent = session.reinforced;
    els.retryMistakesButton.hidden = remainingMistakes.length === 0;
    els.resultsTitle.textContent = percent >= 90 ? 'Excellent recall.' : percent >= 70 ? 'Solid progress.' : 'Keep building.';
    els.resultsSummary.textContent = remainingMistakes.length === 0
      ? `You completed ${baseTotal} questions and cleared every correction before finishing.`
      : `${remainingMistakes.length} ${remainingMistakes.length === 1 ? 'question still needs' : 'questions still need'} another pass. Your results have been saved.`;

    els.resultsBreakdown.innerHTML = Object.entries(session.topicResults).map(([topic, score]) => {
      const value = Math.round(score.correct / score.total * 100);
      return `<div class="breakdown-row"><span title="${escapeAttr(topic)}">${escapeHtml(shortTopic(topic))}</span><span class="breakdown-bar"><i style="--score:${value}%"></i></span><strong>${value}%</strong></div>`;
    }).join('');

    const subjectId = session.subjectId;
    session.resultMistakes = remainingMistakes;
    session.resultSubjectId = subjectId;
    switchView('results');
    renderHome();
  }

  function retrySessionMistakes() {
    if (!session?.resultMistakes?.length) return;
    const pool = session.resultMistakes.map(id => DATA.questions.find(q => q.id === id)).filter(Boolean);
    startSession(shuffle(pool), { mode: 'learn', subjectId: session.resultSubjectId, label: 'Focused correction', reviewOnly: true });
  }

  function switchView(name) {
    els.homeView.classList.toggle('is-active', name === 'home');
    els.quizView.classList.toggle('is-active', name === 'quiz');
    els.resultsView.classList.toggle('is-active', name === 'results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('app').focus({ preventScroll: true });
  }

  function goHome() {
    session = null;
    switchView('home');
    renderHome();
  }

  function requestConfirmation({ title, text, confirmLabel, action }) {
    els.confirmTitle.textContent = title;
    els.confirmText.textContent = text;
    els.confirmActionButton.textContent = confirmLabel;
    confirmAction = action;
    els.confirmDialog.showModal();
  }

  function resetAllProgress() {
    requestConfirmation({
      title: 'Reset all progress?',
      text: 'Mastery, attempts, and mistake history on this device will be erased.',
      confirmLabel: 'Reset progress',
      action: () => {
        progress = defaultProgress();
        saveProgress();
        renderHome();
      }
    });
  }

  function playTone(correct) {
    if (!progress.sound || !window.AudioContext) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = correct ? 620 : 210;
      gain.gain.setValueAtTime(.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .15);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(); oscillator.stop(ctx.currentTime + .16);
    } catch { /* sound is optional */ }
  }

  function shortTopic(topic) {
    const parts = topic.split('—');
    return (parts[1] || parts[0]).trim();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function escapeAttr(value) { return escapeHtml(value); }

  els.setupForm.addEventListener('submit', event => {
    const submitter = event.submitter;
    if (submitter?.value === 'cancel') return;
    event.preventDefault();
    els.setupDialog.close();
    startConfiguredSession();
  });
  els.quickStartButton.addEventListener('click', startMixedSession);
  els.reviewButton.addEventListener('click', () => startReviewSession());
  els.nextButton.addEventListener('click', nextQuestion);
  els.backHomeButton.addEventListener('click', goHome);
  els.retryMistakesButton.addEventListener('click', retrySessionMistakes);
  els.brandButton.addEventListener('click', () => {
    if (session && els.quizView.classList.contains('is-active')) {
      requestConfirmation({ title: 'Leave this session?', text: 'Your current quiz position will be lost, but answered progress is already saved.', confirmLabel: 'Leave session', action: goHome });
    } else goHome();
  });
  els.quitQuizButton.addEventListener('click', () => requestConfirmation({ title: 'Leave this session?', text: 'Your current quiz position will be lost, but answered progress is already saved.', confirmLabel: 'Leave session', action: goHome }));
  els.resetButton.addEventListener('click', resetAllProgress);
  els.soundButton.addEventListener('click', () => { progress.sound = !progress.sound; saveProgress(); renderHome(); });
  els.confirmDialog.addEventListener('close', () => {
    if (els.confirmDialog.returnValue === 'confirm' && confirmAction) confirmAction();
    confirmAction = null;
  });

  document.addEventListener('keydown', event => {
    if (!els.quizView.classList.contains('is-active') || !session) return;
    if (!session.answered && ['1', '2', '3', '4'].includes(event.key)) {
      chooseAnswer(Number(event.key) - 1);
    } else if (session.answered && event.key === 'Enter') {
      event.preventDefault();
      nextQuestion();
    }
  });

  window.addEventListener('beforeunload', saveProgress);
  renderHome();
})();
