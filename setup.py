import os
import sys
import setuptools
import json
from shutil import copyfile
from setuptools.command.install import install
from pathlib import Path


def read(fname):
  with open(os.path.join(os.path.dirname(__file__), fname), 'rt') as f:
    return f.read()


def write_init(version: str):
  with open("./src/lang/python/version.py", "w") as init_file:
    print("__version__ = '{version}'".format(version=version), file=init_file)
  with open("./src/__init__.py", "w") as init_file:
    print("# generated", file=init_file)
    print("from .lang.python.envelope import *", file=init_file)
    print("from .simple_envelope import *", file=init_file)
    print("from .lang.python.version import __version__", file=init_file)
    print("if __name__ == '__main__':", file=init_file)
    print(" print('ready to format a c5 envelope')", file=init_file)

#class PreInstallCommand(install):
#    """Pre-installation for installation mode."""
#    def run(self):



#print(sys.argv)
#print(os.environ)

main_ns = {
        '__name__': 'hack'
        }

if Path("./package.json").is_file():
    version = json.loads(read('package.json'))['version']
    main_ns['__version__'] = version


#ver_path = convert_path('__init__.py')

if sys.argv[0] == 'setup.py' and sys.argv[1] == 'sdist':
    version = json.loads(read('package.json'))['version']
    write_init(version)
    #copyfile('./src/simple_envelope.py', './lang/python/simple_envelope.py')
    #copyfile('./package.json', './lang/python/package.json')
    #main_ns['__version__'] = version


lang_python_init = Path("./src/lang/python/version.py")
if lang_python_init.is_file():
    with open(lang_python_init) as ver_file:
      c = ver_file.read()
      exec(c, main_ns)

lang_python_init = Path("./lang/python/version.py")
if lang_python_init.is_file():
    with open(lang_python_init) as ver_file:
      c = ver_file.read()
      exec(c, main_ns)

#install.run(self)

if main_ns['__version__'] == 'hack':
    print("i-3424ri0jrejoifeowjofgjeajofewoifjoiweafgjoaogsgojavfds");

setuptools.setup(
  name='c5-envelope',
  version=main_ns['__version__'],
  author='Meno Abels',
  author_email='meno.abels@adviser.com',
  setup_requires=[],
  install_requires=[],
  ext_modules=[],
  packages=['c5_envelope', 'c5_envelope.lang.python'],
  package_dir={
      'c5_envelope': 'src', 
      'c5_envelope.lang.python': 'src/lang/python'
  },

  description="C5-ENVELOPE Repository",
  long_description=read('README.md'),
  long_description_content_type="text/markdown",
  keywords = "data ocean lake",
  url = "https://github.com/mabels/envelope",
  classifiers=[
    "Intended Audience :: Developers",
    "Development Status :: 5 - Production/Stable",
    "Programming Language :: Python",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.6",
    "Programming Language :: Python :: 3.7",
    "Programming Language :: Python :: 3.8",
    "Topic :: Scientific/Engineering",
    "Intended Audience :: Developers"
  ], 
)
