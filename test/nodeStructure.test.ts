import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

describe('LaikaTest Node Structure', () => {
  let node: LaikaTest;

  beforeEach(() => {
    node = new LaikaTest();
  });

  it('should implement INodeType interface', () => {
    expect(node.description).toBeDefined();
    expect(node.execute).toBeDefined();
    expect(typeof node.execute).toBe('function');
  });

  it('should have correct basic properties', () => {
    expect(node.description.name).toBe('laikaTest');
    expect(node.description.displayName).toBe('LaikaTest');
    expect(node.description.version).toBe(1);
    expect(node.description.group).toContain('transform');
  });

  it('should have operation selector with 3 options', () => {
    const opProp = node.description.properties.find(
      (p) => p.name === 'operation'
    );
    expect(opProp).toBeDefined();
    expect(opProp?.type).toBe('options');
    expect((opProp as any).options).toHaveLength(3);

    const opValues = (opProp as any).options.map((o: any) => o.value);
    expect(opValues).toContain('getPrompt');
    expect(opValues).toContain('getExperimentPrompt');
    expect(opValues).toContain('pushScores');
  });

  it('should require laikaTestApi credentials', () => {
    expect(node.description.credentials).toBeDefined();
    expect(node.description.credentials).toHaveLength(1);
    expect(node.description.credentials?.[0].name).toBe('laikaTestApi');
    expect(node.description.credentials?.[0].required).toBe(true);
  });

  it('should have correct input/output configuration', () => {
    expect(node.description.inputs).toContain('main');
    expect(node.description.outputs).toContain('main');
  });

  it('should have subtitle showing current operation', () => {
    expect(node.description.subtitle).toBe('={{$parameter["operation"]}}');
  });
});
