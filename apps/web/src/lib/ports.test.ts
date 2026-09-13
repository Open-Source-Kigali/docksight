import { describe, expect, it } from 'vitest'
import { formatPorts } from './ports'

describe('formatPorts', () => {
  it('renders a dash when there are no mappings', () => {
    expect(formatPorts(undefined)).toBe('-')
    expect(formatPorts([])).toBe('-')
  })

  it('renders published ports as public:private and unpublished ports alone', () => {
    expect(
      formatPorts([
        { private: 80, public: '8080', protocol: 'tcp', ip: '0.0.0.0' },
        { private: 443, public: '', protocol: 'tcp' },
      ]),
    ).toBe('8080:80, 443')
  })

  it('keeps the order the agent reported', () => {
    expect(
      formatPorts([
        { private: 5432, public: '5432', protocol: 'tcp' },
        { private: 9187, public: '', protocol: 'tcp' },
        { private: 53, public: '8053', protocol: 'udp' },
      ]),
    ).toBe('5432:5432, 9187, 8053:53')
  })
})
