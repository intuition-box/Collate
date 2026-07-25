'use client';

import { useEffect, useState } from 'react';

const WORDS = ['atoms', 'lists', 'knowledge'] as const;
const FINAL_WORD = 'knowledge';

export function HomeTypewriterWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWordIndex(WORDS.length - 1);
      setText(FINAL_WORD);
      setIsDeleting(false);
      setIsComplete(true);
      return undefined;
    }

    if (isComplete) {
      return undefined;
    }

    const word = WORDS[wordIndex] ?? FINAL_WORD;
    let delay = isDeleting ? 48 : 88;
    let advance = () => setText(isDeleting ? text.slice(0, -1) : word.slice(0, text.length + 1));

    if (!isDeleting && text === word) {
      if (wordIndex === WORDS.length - 1) {
        setIsComplete(true);
        return undefined;
      }

      delay = 820;
      advance = () => setIsDeleting(true);
    } else if (isDeleting && text.length === 0) {
      delay = 140;
      advance = () => {
        setWordIndex((current) => current + 1);
        setIsDeleting(false);
      };
    }

    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [isComplete, isDeleting, text, wordIndex]);

  return (
    <span className="relative block">
      <span className="sr-only">Create atoms, lists, and knowledge.</span>
      <span aria-hidden="true" className="invisible block whitespace-nowrap">
        <span className="block sm:inline">Create </span>
        <span>{FINAL_WORD}.</span>
      </span>
      <span aria-hidden="true" className="absolute inset-0 block sm:whitespace-nowrap">
        <span className="block sm:inline">Create </span>
        <span>{text}</span>
        <span className={text ? 'opacity-100' : 'opacity-0'}>.</span>
        {isComplete ? null : <span className="typewriter-caret ml-[0.06em] inline-block h-[0.78em] w-[0.055em] bg-accent align-baseline" />}
      </span>
    </span>
  );
}
