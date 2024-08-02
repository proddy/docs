## How to Hardware Reset

If you have a GPIO Button configured (enabled by default on all BBQKees boards) pressing this has different actions:

- _single press_: does nothing
- _double press_: re-connects the WiFi
- _hold for 10 seconds_: performs a factory reset. EMS-ESP will restart in Access Point mode

## Decoding EMS Telegrams

_Written by @MichaelDvP in [this article](https://github.com/emsesp/EMS-ESP32/discussions/1612#discussioncomment-8408868):_

Best overview of known telegrams is from [Norberts1](https://github.com/norberts1/hometop_HT3/blob/master/HT3/docu/HT_EMS_Bus_messages.pdf) and the [EMS-Wiki](https://emswiki.thefischer.net/doku.php). In general we can say:

- measurement values are broadcasted periodical 10 sec / 1 min
- settings are only broadcasted after a change
- changing a setting of a device via the UI of thermostat results in a message thermostat -w-> device with only this value
- some devices broadcast fast changing values as single values
- measured temperatures are normally 2 bytes (SHORT) with factor 0.1 (e.g. 01 23 -> 0x0123 -> dez 291 -> 29.1°C)
- air temperature settings are often factor 0.5 as single byte (INT) (e.g. 0x2D -> dez 45 -> 22.5°C)
- water temperature settings are typically single byte (UINT) (e.g. 0x3C -> 60°C), differential values (hysteresis in Kelvin) are signed (INT)
- percent settings are single byte (UINT) (0x64 -> 100%)
- on/off states or settings can be single byte with on/off 0xFF/0x00, or 0x01/0x00 or a single bit in a byte together with 7 other states
- times and energy is typically 3 or 4 bytes with or without factor

For different brands/devices Bosch sometimes use different expressions for the same value, Maybe changing developers or they like to make reverse engineering difficult!

If you search a setting, log the telegrams for the device (log all or watch <device-id>) and change the setting on the thermostat to different states/values. Then search for these values in the log. If you search for a measurement, log the device and view the value on the thermostat and wait for changes, note old/new values and time. Then check the log for this time stamp (or 10 sec / 1 min later) and the value within a telegram. Best to have more changes/values to be sure.

## Can EMS-ESP simulate a Thermostat?

No, but in theory it could.

As **MichaelDvP** points out _"a thermostat is a clever electronic device. You can put in the desired room temperature and it calculates from some parameters and measurements the required flowtemp for this room temperature and sends it to the boiler. This happens in a control loop and is updated often."_

And **mtc716** said _"A thermostat creates a heat curve that is constantly adapted to the surrounding temperatures and used to estimate which water temperature is necessary in order to bring the room temperature up. There are some good articles in the net about how to setup the heat curve correctly. The main parameters you need are "design temp" which is the heating water temp at minimal outside temp. Furthermore you need the "comfort temp" like explained before and the "temp offset" which causes a parallel shift in the heating curve."_

See [Smart control a heating system with HA?](https://github.com/emsesp/EMS-ESP32/issues/144)
and [thermostat emulation](https://github.com/emsesp/EMS-ESP32/issues/151).

## Bus protocols and Tx mode explained

Protocol and timing are different things, you pick the tx-mode that works best.

HT3 is the Junkers electronic and HT3 protocol is the same as EMS, only in first byte (sender) the highest bit is set. Each telegram we send starts with 0B in a Buderus system, but with 8B in Junkers. This makes the devices of the different brands incompatible. EMS-ESP checks the bus on start and select the right protocol automatically. Also Junkers uses different telegram numbers/orders. Bosch labeled modules uses the same telegram numbers as Buderus, but addressing like Junkers, so also incompatible. You can't connect Junkers or Buderus modules to a Bosch heating system.

Tx-mode is the send timing: The client devices send by current modulation, the master by voltage modulation. This allows full duplex (Hardware mode), but depending on line impedance drawing current also influences the voltage. When sending, the master repeats every byte sent by the device to publish it to the other devices. With a Tx-mode of "EMS" we wait for the master byte before sending the next. The older Junkers seems to have a lower timeout so we need to start the next byte before the master echo is completed ("HT3"). "EMS+" is less critical and we can wait a bit longer than one byte to allow voltage to be stabilized after the sending.
