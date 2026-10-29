import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataBadge } from '../components/ui/DataBadge';
import { HealthPill } from '../components/ui/HealthPill';
import { DEFAULT_HEALTH } from '../data/mockScenarios';

describe('DataBadge UI Component', () => {
  it('renders Validated sentence-case badge', () => {
    render(<DataBadge badge="Validated" />);
    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('renders QpiAI Opt local solver badge', () => {
    render(<DataBadge badge="QpiAI Opt · local solver" />);
    expect(screen.getByText('QpiAI Opt · local solver')).toBeInTheDocument();
  });

  it('renders VQC local statevector badge', () => {
    render(<DataBadge badge="VQC · local statevector" />);
    expect(screen.getByText('VQC · local statevector')).toBeInTheDocument();
  });

  it('renders Simulated held-out run badge', () => {
    render(<DataBadge badge="Simulated · held-out run" />);
    expect(screen.getByText('Simulated · held-out run')).toBeInTheDocument();
  });
});

describe('HealthPill UI Component', () => {
  it('renders active solvers slot capacity', () => {
    render(<HealthPill health={DEFAULT_HEALTH} />);
    expect(screen.getByText(/2 Solvers/)).toBeInTheDocument();
  });
});
