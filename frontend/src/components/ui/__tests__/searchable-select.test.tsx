import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from '../searchable-select';
import type { SearchableSelectOption } from '../searchable-select';

const mockOptions: SearchableSelectOption[] = [
  { value: 'maharashtra', label: 'Maharashtra' },
  { value: 'karnataka', label: 'Karnataka' },
  { value: 'tamil_nadu', label: 'Tamil Nadu' },
  { value: 'kerala', label: 'Kerala' },
];

describe('SearchableSelect', () => {
  it('renders with placeholder when no value is selected', () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onValueChange={onChange}
        placeholder="Select a state"
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select a state')).toBeInTheDocument();
  });

  it('displays the selected option label when a value is set', () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value="karnataka"
        onValueChange={onChange}
        placeholder="Select a state"
      />
    );

    expect(screen.getByText('Karnataka')).toBeInTheDocument();
    // The placeholder should NOT be shown
    expect(screen.queryByText('Select a state')).not.toBeInTheDocument();
  });

  it('opens the popover and shows options when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onValueChange={onChange}
        placeholder="Select a state"
        searchPlaceholder="Search states..."
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // After clicking, the options should be visible
    expect(screen.getByText('Maharashtra')).toBeInTheDocument();
    expect(screen.getByText('Karnataka')).toBeInTheDocument();
    expect(screen.getByText('Tamil Nadu')).toBeInTheDocument();
    expect(screen.getByText('Kerala')).toBeInTheDocument();
    // The search input should be visible
    expect(screen.getByPlaceholderText('Search states...')).toBeInTheDocument();
  });

  it('calls onValueChange when an option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onValueChange={onChange}
        placeholder="Select a state"
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Kerala'));

    expect(onChange).toHaveBeenCalledWith('kerala');
  });

  it('deselects the current value when the same option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value="maharashtra"
        onValueChange={onChange}
        placeholder="Select a state"
      />
    );

    await user.click(screen.getByRole('combobox'));
    // "Maharashtra" appears in both the trigger and the dropdown option.
    // Target the option element specifically.
    await user.click(screen.getByRole('option', { name: /Maharashtra/i }));

    // Clicking the already-selected option should pass empty string
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renders as disabled when the disabled prop is true', () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onValueChange={onChange}
        placeholder="Select a state"
        disabled={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('shows custom empty text when no options match', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={[]}
        value=""
        onValueChange={onChange}
        placeholder="Select"
        emptyText="Nothing here"
      />
    );

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('sets aria-expanded correctly based on open state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onValueChange={onChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
