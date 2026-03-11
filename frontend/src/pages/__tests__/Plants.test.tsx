import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Plants } from '../Plants';
import { AppProvider } from '@/store/AppContext';
import type { Plant } from '@/types';

// Mock gsap — it's not needed in tests and doesn't work in jsdom
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    set: vi.fn(),
    registerPlugin: vi.fn(),
  },
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock plantService
vi.mock('@/services/plantService', () => ({
  plantService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getRooms: vi.fn(),
  },
}));

// Mock INDIA_STATES data
vi.mock('@/data/indiaLocations', () => ({
  INDIA_STATES: [
    { name: 'Maharashtra', cities: ['Mumbai', 'Pune'] },
    { name: 'Karnataka', cities: ['Bangalore', 'Mysore'] },
  ],
}));

function renderPlants() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Plants />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Plants Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header and controls', () => {
    renderPlants();

    expect(screen.getByText('Plants')).toBeInTheDocument();
    expect(screen.getByText('Manage your mushroom farm locations')).toBeInTheDocument();
    expect(screen.getByText('New Plant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search plants...')).toBeInTheDocument();
  });

  it('shows the empty state when there are no plants', () => {
    renderPlants();

    expect(screen.getByText('No plants found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or create a new plant.')).toBeInTheDocument();
    expect(screen.getByText('Create Plant')).toBeInTheDocument();
  });

  it('renders the search input and allows typing', async () => {
    const user = userEvent.setup();
    renderPlants();

    const searchInput = screen.getByPlaceholderText('Search plants...');
    await user.type(searchInput, 'Oyster Farm');

    expect(searchInput).toHaveValue('Oyster Farm');
  });

  it('renders the type filter dropdown', () => {
    renderPlants();

    // The type filter should exist with "All Types" as default text
    // Radix Select renders the trigger with the value text
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('renders the status filter dropdown', () => {
    renderPlants();

    expect(screen.getByText('All Status')).toBeInTheDocument();
  });
});
