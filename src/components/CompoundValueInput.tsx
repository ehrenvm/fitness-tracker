import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

interface CompoundValueInputProps {
  activity: string;
  value: { value1: string; value2: string };
  onChange: (values: { value1: string; value2: string }) => void;
}

const CompoundValueInput: React.FC<CompoundValueInputProps> = ({ activity, value, onChange }) => {
  // Extract units from activity name, e.g., "Height (ft/in)" -> ["ft", "in"]
  const unitsMatch = activity.match(/\((.*?)\)/);
  const [unit1, unit2] = unitsMatch ? unitsMatch[1].split('/') : ['', ''];

  const handleChange = (field: 'value1' | 'value2', newValue: string) => {
    onChange({
      ...value,
      [field]: newValue
    });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <TextField
        type="number"
        label={unit1}
        value={value.value1}
        onChange={(e) => handleChange('value1', e.target.value)}
        size="small"
        sx={{ width: '120px' }}
      />
      <Typography sx={{ mt: 1 }}>/</Typography>
      <TextField
        type="number"
        label={unit2}
        value={value.value2}
        onChange={(e) => handleChange('value2', e.target.value)}
        size="small"
        sx={{ width: '120px' }}
      />
    </Box>
  );
};

export default CompoundValueInput; 