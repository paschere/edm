import {
  reactExtension,
  BlockStack,
  TextField,
  useApplyAttributeChange,
  useAttributeValues,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.contact.render-after',
  () => <CedulaField />,
);

function CedulaField() {
  const applyChange = useApplyAttributeChange();
  const [cedula] = useAttributeValues(['Cedula NIT']);

  return (
    <BlockStack>
      <TextField
        label="Cédula / NIT"
        required
        value={cedula ?? ''}
        onChange={(val) =>
          applyChange({ type: 'updateAttribute', key: 'Cedula NIT', value: val })
        }
        helpText="Requerido para factura electrónica"
      />
    </BlockStack>
  );
}
